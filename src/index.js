const express = require('express');
const bodyParser = require('body-parser');
const route = require('./routers/route');
const  mongoose  = require('mongoose');
const app = express();

app.use(bodyParser.json());



mongoose.connect("mongodb+srv://Saurabh-FunctionUp:SAURABHtiwari2501@cluster0.ppnw4vg.mongodb.net/Urlshortner", {
        useNewUrlParser: true
    })
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))


app.use('/', route)


app.listen(process.env.PORT || 3000, function() {
    console.log('Express app running on port ' + (process.env.PORT || 3000))
});