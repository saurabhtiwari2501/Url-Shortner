const urlModel = require("../models/urlModel")
const shortId = require('shortid')
const redis = require('redis')
const { promisify } = require('util')
const url = require('validator')


// ---------------- VALIDATIONS -------------
const isValid = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true
}

const isValidReqBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}

// ------------ Connect to Redis

const redisClient = redis.createClient(
    13679,                                                          // port no
    "redis-13679.c264.ap-south-1-1.ec2.cloud.redislabs.com",   //endpoint
    { no_ready_check: true }
);
redisClient.auth("DJVYDAOFdh0QfAGosRci58kpc2bjKkjD",    //password - performing authentication
    function (err) {
        if (err) throw err;
    });

redisClient.on("connect", async function () {   // connecting to cache memory
    console.log("Connected to Redis..");
});

// --- Connection setup for redis  - using SET and GET 

const SETEX_ASYNC = promisify(redisClient.SETEX).bind(redisClient)
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient)


// ======================================= CREATE URL ======================================================
const createUrl = async function (req, res) {
    try {
        const data = req.body;
        const { longUrl } = data

        if (!isValidReqBody(data)) {
            return res.status(201).send({ status: false, message: "Please provide data in request body" })
        }

        if (!longUrl || !isValid(longUrl)) {
            return res.status(201).send({ status: false, message: "Invalid parameters...! Please provide longURL" })
        }

       let longURL = data.longUrl.toLowerCase()
        if (!url.isURL(longUrl)) {
            return res.status(201).send({ status: false, message: "please provide a valid long URL" })
        }
        // ---------- Getting Data from Cache
        const cachedData = await GET_ASYNC(`${longURL}`)
        if (cachedData) {
            return res.status(200).send({ status: true, message: "Data from Cache", data: JSON.parse(cachedData) })
        }

        // ----------- Checking for duplicate  long Url
        const duplicateUrl = await urlModel.findOne({ longURL: longURL }).select({ longUrl: 1, shortUrl: 1, urlCode: 1, _id: 0 })
        if (duplicateUrl) {
            await SETEX_ASYNC(`${longURL}`, 30, JSON.stringify(longURL))        // setting in cache
            return res.status(201).send({ status: true, message: "Long URL already Exists", data: duplicateUrl })
        }

        // ---------- Generating urlCode and shortUrl

        const urlCode = shortId.generate()
        const shortUrl = `http://localhost:3000/${urlCode}`

        data.urlCode = urlCode
        data.shortUrl = shortUrl

        // ----------- Creating data
        const savedData = await urlModel.create(data)
        const resData = ({ longURL: savedData.longURL, shortUrl: savedData.shortUrl, urlCode: savedData.urlCode })
        await SETEX_ASYNC(`${longURL}`, 20, JSON.stringify(resData))    // setting data into cache after creating new data
        return res.status(201).send({ status: true, message: "Data Created", data: resData })

    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }
}

// ==========================================GET URL =================================================

const getUrl = async function (req, res) {
    try {
        const urlCode = req.params.urlCode

        if (!shortId.isValid(urlCode)) {
            return res.status(400).send({ status: false, message: "Url Code is not a valid urlCode. Please provide correct input" })
        }
        let cachedURLCode = await GET_ASYNC(`${req.params.urlCode}`)
        if (cachedURLCode) {
            return res.status(302).redirect(cachedURLCode)
        } else {
            const findUrlcode = await urlModel.findOne({ urlCode: urlCode })
            if (!findUrlcode) {
                return res.status(404).send({ status: false, message: "URL Not Found" })
            }
            await SETEX_ASYNC(`${req.params.urlCode}`, 30, (findUrlcode.longUrl))
            return res.status(302).redirect(findUrlcode.longUrl)
        }

    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }

}

module.exports = { isValid, isValidReqBody, createUrl, getUrl }
