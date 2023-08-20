const express = require('express');
const jwt = require("jsonwebtoken");
const app = express();
const bcrypt = require('bcrypt');

// loading environment variables
require('dotenv').config()

const mongoose = require('mongoose');

// Connect MongoDB at default port 27017.
mongoose.connect(`${process.env.DB_STRING}courses`, {})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

app.use(express.json());

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean,
  author: String
});

const Admin = mongoose.model('Admin', adminSchema);
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);

function verifyAdmin(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({
            message: 'No Authorization Header'
        })
    }
    try {
        const token = authorization.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({
                message: 'Invalid Token Format'
            })
        }
        const decode = jwt.verify(token, process.env.ADMIN_SECRET);
        req.admin = decode
        next()
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                message: 'Session Expired',
                error: error.message,
            })
        }
        if (error instanceof jwt.JsonWebTokenError || error instanceof TokenError) {
            return res.status(401).json({
                message: 'Invalid Token',
                error: error.message,
            })
        }
        res.status(500).json({
            message: 'Internal server Error',
            error: error.message,
            stack: error.stack
        });
    }
}

function verifyUser(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
      return res.status(401).json({
          message: 'No Authorization Header'
      })
  }
  try {
      const token = authorization.split('Bearer ')[1];
      if (!token) {
          return res.status(401).json({
              message: 'Invalid Token Format'
          })
      }
      const decode = jwt.verify(token, process.env.USER_SECRET);
      req.user = decode
      next()
  } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({
              message: 'Session Expired',
              error: error.message,
          })
      }
      if (error instanceof jwt.JsonWebTokenError || error instanceof TokenError) {
          return res.status(401).json({
              message: 'Invalid Token',
              error: error.message,
          })
      }
      res.status(500).json({
          message: 'Internal server Error',
          error: error.message,
          stack: error.stack
      });
  }
}

// Admin routes
app.post('/admin/signup', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
  
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin signed up successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating admin.' });
  }
});

app.post('/admin/login', async (req, res) => {
  try {
    // logic to log in admin
    const { username, password } = req.headers
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Check if admin exists and password matches
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    // Check password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    // Generate a JWT token with a 1-hour expiration time
    const token = jwt.sign({ username: username }, process.env.ADMIN_SECRET, { expiresIn: '1h' });
    res.status(201).json({ message: 'Admin signed up successfully.', token });
  } catch (error) {
    res.status(500).json({ message: 'Error during login.' });
  }
});

app.post('/admin/courses', verifyAdmin, async (req, res) => {
  try {
    // logic to create a course
    const { title, description, price, imageLink } = req.body;
    if (!title || !description || !price || !imageLink) {
      return res.status(400).json({ error: 'title, description, price and imageLink all fields are required.' });
    }
    
    const newCourse = new Course({
      title,
      description,
      price,
      imageLink,
      published: false,
      author: req.admin.username
    })
    await newCourse.save()
    res.status(201).json({ message: 'Course created successfully.' });
  } catch (error) {
    res.status(500).send({error})
  }
});

app.put('/admin/courses/:courseId', verifyAdmin, async (req, res) => {
  try {
    // logic to edit a course
    const updatedCourse = await Course.findByIdAndUpdate( req.params.courseId, req.body, { new: true })
    
    if (!updatedCourse) return res.status(404).send({error})
    
    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(500).send({error})
  }
});

app.put('/admin/courses/:courseId/publish', verifyAdmin, async (req, res) => {
  try {
    // const courseId = parseInt(req.params.courseId);
    const updatedCourse = await Course.findByIdAndUpdate( req.params.courseId, { published: true }, { new: true })
    if (!updatedCourse) return res.status(404).send({error})
    
    res.status(200).json(updatedCourse);
  } catch (error) {
    res.status(500).send({error})
  }
});

app.get('/admin/courses', verifyAdmin, async (req, res) => {
  try {
    // logic to get all courses
    const adminCourses = await Course.find({ author: req.admin.username })
    res.send(adminCourses)
  } catch (error) {
    res.status(500).send({error})
  }
});

// User routes
app.post('/users/signup', async (req, res) => {
  // logic to sign up user
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if user already exists
  const USERS = await getUsers()
  if (USERS.some(user => user.username === username)) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const newUser = { username, password, courses: [] };
  USERS.push(newUser);
  await writeUsers(USERS)
  res.status(201).json({ message: 'User signed up successfully.' });
});

app.post('/users/login', async (req, res) => {
  // logic to log in user
  const { username, password } = req.headers
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Check if user exists and password matches
  const USERS = await getUsers()
  const user = USERS.find(user => user.username === username && user.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  // Generate a JWT token with a 1-hour expiration time
  const token = jwt.sign({ username: username }, process.env.USER_SECRET, { expiresIn: '1h' });
  res.status(201).json({ message: 'Admin signed up successfully.', token });
});

app.get('/users/courses', verifyUser, async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses.' });
  }
});

app.post('/users/courses/:courseId', verifyUser, async (req, res) => {
  const courseId = parseInt(req.params.courseId)
  const USERS = await getUsers()
  const currentUser = USERS.find(user => user.username == req.user.username)
  const currentCourses = currentUser.courses
  // logic to purchase a course
  let alreadyPurchased = currentCourses.includes(courseId);
  if (alreadyPurchased) return res.status(400).send({error: "Already purchased"})
  
  const user = USERS.find(user => user.username === req.user.username);
  user.courses.push(courseId)
  await writeUsers(USERS)
  return res.send({message: "Course purchased successfully"})
});

app.get('/users/purchasedCourses', verifyUser, async (req, res) => {
  const USERS = await getUsers()
  const currentUser = USERS.find(user => user.username == req.user.username)
  const currentCourses = currentUser.courses
  // logic to view purchased courses
  const COURSES = await getCourses()
  let userCourses = COURSES.filter(course => currentCourses.includes(course.id));
  res.send(userCourses)
});

app.listen(3000, async () => {
  console.clear()
  console.log('Server is listening on port https://localhost:3000');
});
