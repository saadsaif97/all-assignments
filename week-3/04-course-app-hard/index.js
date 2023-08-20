const express = require('express');
const jwt = require("jsonwebtoken");
const app = express();
const fs = require('fs/promises');

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

async function getAdmins() {
  try {
    const data = await fs.readFile('admins.json', 'utf-8');
    return JSON.parse(data)
  } catch (error) {
    console.log({error})
  }
}

async function writeAdmins(admins) {
  try {
    await fs.writeFile('admins.json', JSON.stringify(admins, null, 2), 'utf-8');
  } catch (error) {
    console.log({error})
  }
}

async function getUsers() {
  try {
    const data = await fs.readFile('users.json', 'utf-8');
    return JSON.parse(data)
  } catch (error) {
    console.log({error})
  }
}

async function writeUsers(users) {
  try {
    await fs.writeFile('users.json', JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.log({error})
  }
}

async function getCourses() {
  try {
    const data = await fs.readFile('courses.json', 'utf-8');
    return JSON.parse(data)
  } catch (error) {
    console.log({error})
  }
}

async function writeCourses(courses) {
  try {
    await fs.writeFile('courses.json', JSON.stringify(courses, null, 2), 'utf-8');
  } catch (error) {
    console.log({error})
  }
}

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const USER_SECRET = process.env.USER_SECRET;

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
        const decode = jwt.verify(token, ADMIN_SECRET);
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
      const decode = jwt.verify(token, USER_SECRET);
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
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if admin already exists
  const ADMINS = await getAdmins()
  if (ADMINS.some(admin => admin.username === username)) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const newAdmin = { username, password };
  ADMINS.push(newAdmin);
  await writeAdmins(ADMINS)
  res.status(201).json({ message: 'Admin signed up successfully.' });
});

app.post('/admin/login', async (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Check if admin exists and password matches
  const ADMINS = await getAdmins()
  const admin = ADMINS.find(admin => admin.username === username && admin.password === password);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  
  // Generate a JWT token with a 1-hour expiration time
  const token = jwt.sign({ username: username }, ADMIN_SECRET, { expiresIn: '1h' });
  res.status(201).json({ message: 'Admin signed up successfully.', token });
});

app.post('/admin/courses', verifyAdmin, async (req, res) => {
  // logic to create a course
  const { title, description, price, imageLink } = req.body;
  if (!title || !description || !price || !imageLink) {
    return res.status(400).json({ error: 'title, description, price and imageLink all fields are required.' });
  }

  const COURSES = await getCourses()
  const newCourse = {
    id: COURSES.length,
    title,
    description,
    price,
    imageLink,
    published: false,
    author: req.admin.username
  };

  COURSES.push(newCourse);
  await writeCourses(COURSES)
  res.status(201).json({ message: 'Course created successfully.' });
});

app.put('/admin/courses/:courseId', verifyAdmin, async (req, res) => {
  // logic to edit a course
  const courseId = parseInt(req.params.courseId);
  const COURSES = await getCourses()
  const course = COURSES.find(course => course.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const { title, description, price, imageLink } = req.body;
  if (title) course.title = title;
  if (description) course.description = description;
  if (price) course.price = price;
  if (imageLink) course.imageLink = imageLink;
  await writeCourses(COURSES)

  res.status(200).json({ message: 'Course updated successfully.' });
});

app.put('/admin/courses/:courseId/publish', verifyAdmin, async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const COURSES = await getCourses()
  const course = COURSES.find(course => course.id === courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  course.published = true;
  await writeCourses(COURSES)
  res.status(200).json({ message: 'Course published successfully.' });
});

app.get('/admin/courses', verifyAdmin, async (req, res) => {
  // logic to get all courses
  const COURSES = await getCourses()
  let adminCourses = COURSES.filter(course => course.author === req.admin.username);
  res.send(adminCourses)
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
  const token = jwt.sign({ username: username }, USER_SECRET, { expiresIn: '1h' });
  res.status(201).json({ message: 'Admin signed up successfully.', token });
});

app.get('/users/courses', verifyUser, async (req, res) => {
  // logic to list all courses
  const COURSES = await getCourses()
  res.send(COURSES)
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
