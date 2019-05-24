var express = require("express");
// var exphbs  = require('express-handlebars');
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Initialize Handlebars

// app.engine('handlebars', exphbs());
// app.set('view engine', 'handlebars');
 
// app.get('/', function (req, res) {
//     res.render('home');
// });

// Connect mongodb to heroku

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mongoObits";

// Configure middleware
// Use morgan logger for logging requests
app.use(logger("dev"));

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
app.use(express.static("public"));


// Connect to the Mongo DB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
// mongoose.connect("mongodb://127.0.0.1:27017/mongoHeadlines", { useNewUrlParser: true });


// Routes
// app.get("/", function(req, res) {
//   res.json(path.join(__dirname, "public/index.html"));
// });

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("http://www.altoonamirror.com/obituaries/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every article within an Obit tag, and do the following:
    $("article").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.time = $(this)
        .children("time")
        .text();
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      // result.image = $(this)
      //   .children("img")
      //   .attr("src");

      // Create a new Obit using the `result` object built from scraping
      db.Obit.create(result)
        .then(function(dbObit) {
          // View the added result in the console
          console.log(dbObit);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete <br><br><a href='/'>Return to Home Page</a>");

  });

  
});

// Route for getting all Obits from the db
app.get("/obituaries", function(req, res) {
  // Grab every document in the Obits collection
  db.Obit.find({})
    .then(function(dbObit) {
      // If we were able to successfully find Obits, send them back to the client
      res.json(dbObit);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Obit by id, populate it with it's note
app.get("/obituaries/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Obit.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbObit) {
      // If we were able to successfully find an Obit with the given id, send it back to the client
      res.json(dbObit);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Obit's associated Note
app.post("/obituaries/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Obit with an `_id` equal to `req.params.id`. Update the Obit to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Obit.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbObit) {
      // If we were able to successfully update an Obit, send it back to the client
      res.json(dbObit);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
