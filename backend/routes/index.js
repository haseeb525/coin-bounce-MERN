const express = require('express');
const authController = require('../controller/authController');
const blogController = require('../controller/blogController')
const commentController = require ('../controller/commentController')
const auth = require('../middlewares/auth');

const router = express.Router();

// user routes
// register
router.post('/register', authController.register);
// login
router.post('/login', authController.login);
// logout
router.post('/logout', auth, authController.logout)
// refresh
router.get('/refresh', authController.refresh);


// blog routes
// create
router.post('/blog', auth, blogController.create);
// get all
router.get('/blog/all', auth, blogController.getAll);
// read blog by id
router.get('/blog/:id', auth, blogController.getById);
// update
router.put('/blog', auth, blogController.update);
// delete
router.delete('/blog/:id', auth, blogController.delete);

// comment routes
// create 
// read 
// delete


module.exports = router;