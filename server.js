const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')
const shortid = require('shortid');
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track' )
const Schema = mongoose.Schema

const UserSchema = new Schema ({
  username: String,
  _id: String
})
const User = mongoose.model('User', UserSchema)

const ExerciseSchema = new Schema({
  userId: {type: String, required: true},
  description:  {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now}
});
const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  const user = new User({username: req.body.username, _id: shortid.generate()});
  user.save((err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json({username: data.username, _id: data._id})
    }
  })
})

app.post('/api/exercise/add', (req, res) => {
  User.findById(req.body.userId, (err, data) => {
    if (err) {
      console.log(err);
    } else if (!data) {
      console.log(err)
      res.send("Unknown User ID");
    } else {
      const exercise = new Exercise({
        userId: req.body.userId, 
        description: req.body.description, 
        duration: parseInt(req.body.duration), 
        date: new Date(req.body.date)
      });
      exercise.save((err,data) => {
        if (err) {
          console.log(err);
          res.send("Please include all required fields");
        } else {
          const obj = {
            username: data.username,
            description: exercise.description,
            duration: exercise.duration,
            _id: data.userId,
            date: exercise.date.toDateString()
          }
          res.json(obj);
        }
      })
    }
  })
})

app.get('/api/exercise/log', (req,res) => {
  let {userId, from, to } = req.query;
  if (from) {
    from = new Date(from)
  }
  if (to) {
    to = new Date(to)
  }
  let user = User.findOne({_id: userId}, (err, data) => {
    if (err) {
      console.log(err);
    } else if (data.length === 0) {
      res.send("User not found")
    } else {
      let logs = Exercise.find({userId: userId}, (err, exercises) => {
        if (err) {
          console.log(err);
        } else {
          if (from && to) {
            exercises = exercises.filter(el => el.date >= from && el.date <= to);
          } else if (from && !to) {
            exercises = exercises.filter(el => el.date >= from);
          } else if (!from && to) {
            exercises = exercises.filter(el => el.date <= to);
          }
          console.log(data._id)
          res.json({
              _id: data._id,
              username: data.username,
              from: from,
              to: to,
              count: exercises.length,
              log: exercises
            })
          
        }
      })
    }
  })
})

app.get('/api/exercise/users', (req, res) => {
  User.find({}, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.json(data);
    }
  })
});

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
