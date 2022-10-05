const express = require("express");
const router = express.Router()
const urlcontroller = require('../controllers/urlController')


router.get("/test-me", function (req, res) {
    res.send("server is running ")
})

// ----------------------------- CREATE URL --------------------------------------
router.post("/url/shorten", urlcontroller.createUrl)
// ----------------------------- GET URL -----------------------------------------
router.get('/:urlCode', urlcontroller.getUrl)

//----------------------------Error Handing----------------------
router.all('/*', (req, res) => {
    res.status(404).send({ status: false, message: "URL Not Found" })
})

module.exports = router