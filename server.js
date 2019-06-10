const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {useNewUrlParser: true} )
mongoose.set('useFindAndModify', false);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//User Schema
var userSchema = new mongoose.Schema({
  user: String,
  exercise: [{date: Date, duration: Number, description: String}]
})
var userModel = mongoose.model('userModel', userSchema)

//post new user
app.post('/api/exercise/new-user', function(req,res) {
  var userName = req.body.username
  var userExist = userModel.findOne({user: userName}, function(err,data){
    if (err) return console.log(err);
    else{
      if (data) {
        res.send("username already exists")
      }
      else{
        var newUser = new userModel({
          user: userName
        })
        newUser.save(function(err,data){
          if (err) return console.log(err)
          res.json({user: userName,_id: data._id})
          return data
        })
      }
    }
  })
})

//post exercise
//req.body={"userId":"aerg","description":"arehyythyt","duration":"juykilui","date":"5/14/18"}
app.post('/api/exercise/add', function(req,res) {
  console.log("adding exercise")
  var userId = req.body.userId
  var dateToUse = req.body.date
  if (!req.body.date){
    dateToUse = new Date()
    console.log(dateToUse)
  }
  var userExist = userModel.findByIdAndUpdate(userId,{"$push": {exercise: {description:req.body.description, duration: req.body.duration, date: dateToUse}}}, function(err,data) {
    if (err) {
      //display different error messages
      if (err.path=="_id"){res.send("unknown userId")}
      else if (err.reason.path=="duration") {res.send('please enter valid number of minutes')}
      else if (err.reason.path=="date") {res.send("please enter valid date")}
      else {res.send(err)}
    }
    else {res.json({userId: userId, description: req.body.description, duration: req.body.duration, date: dateToUse})}
    
  })
})

//get users
app.get("/api/exercise/users", function(req, res) {
  var ppl = userModel.find({}).select("_id").select("user")
  ppl.exec(function(err,data){
    if (err) return console.log(err)
    res.send(data)
  })
})

//get exercise log
app.get("/api/exercise/log", function(req,res){
  var userId = req.query.userId
  var from = new Date(req.query.from)
  var to = new Date(req.query.to)
  //initialize from & to if left blank/invalid date
  if (from == "Invalid Date") {from = new Date(0)}
  if (to == "Invalid Date") {to = new Date()}
  var limit = req.query.limit
  var getUser = userModel.findById(userId, function(err,data) {
    if (err) {res.send("unknown userId")}
    else {
      //sort from oldest to newest exercise
      data.exercise.sort(function(a,b) {return a.date-b.date})
      //remove _id & filter for dates between from & to
      var log = data.exercise.map(
        (session) => {if (session.date > from && session.date < to) {return {description: session.description, duration: session.duration, date: session.date}}})
      var filteredLog = log.filter(session => session != null)
      //only count what was entered between from & to
      var count = filteredLog.length
      //limit logs shown by what is entered showing more recent logs over older
      if (limit) {filteredLog = filteredLog.slice(count-limit,count)}
      res.json({_id:userId,username:data.user,count:count,log:filteredLog})
    }
  })  
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
