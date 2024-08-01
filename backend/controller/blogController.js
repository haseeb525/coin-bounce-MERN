const Joi = require('joi');
const fs = require('fs');
const Blog = require('../models/blog');
const { BACKEND_SERVER_PATH } = require('../config/index');
const BlogDTO = require('../dto/blog');
const BlogDetailsDTO = require('../dto/blog-details');
const Comment = require('../models/comment');

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
    async create(req, res, next) {
        // 1. Validate request body
        // 2. Handle photo storage, naming
        // 3. Store in DB
        // 4. Return response

        const createBlogSchema = Joi.object({
            title: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            content: Joi.string().required(),
            photo: Joi.string().required()
        });

        const { error } = createBlogSchema.validate(req.body);
        if (error) {
            return next(error);
        }

        const { title, author, content, photo } = req.body;

        // Read photo as buffer
        const buffer = Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""), "base64");
        
        // Allocate a random name
        const imagePath = `${Date.now()}-${author}.png`;

        // Save locally
        try {
            fs.writeFileSync(`storage/${imagePath}`, buffer);
        } catch (error) {
            return next(error);
        }

        // Save blog in DB
        let newBlog;
        try {
            newBlog = new Blog({
                title,
                author,
                content,
                photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
            });

            await newBlog.save();
        } catch (error) {
            return next(error);
        }

        const blogDto = new BlogDTO(newBlog);
        return res.status(201).json({ blog: blogDto });
    },

    async getAll(req, res, next) {
        try {
            const blogs = await Blog.find({});
            const blogsDto = blogs.map(blog => new BlogDTO(blog));
            return res.status(200).json({ blogs: blogsDto });
        } catch (error) {
            return next(error);
        }
    },

    async getById(req, res, next) {
        // Validate ID
        // Return response

        const getByIdSchema = Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        });

        const { error } = getByIdSchema.validate(req.params);
        if (error) {
            return next(error);
        }

        const { id } = req.params;
        let blog;

        try {
            blog = await Blog.findOne({ _id: id }).populate('author');
            console.log(blog); // Log the blog object to inspect its value
            if (!blog) {
                return res.status(404).json({ message: "Blog not found" });
            }
        } catch (error) {
            return next(error);
        }

        const blogDto = new BlogDetailsDTO(blog);
        return res.status(200).json({ blog: blogDto });
    },

    async update(req, res, next) {
        // Validate request body
        // Update blog details

        const updateBlogSchema = Joi.object({
            title: Joi.string().required(),
            content: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            blogId: Joi.string().regex(mongodbIdPattern).required(),
            photo: Joi.string()
        });

        const { error } = updateBlogSchema.validate(req.body);
        if (error) {
            return next(error);
        }

        const { title, content, author, blogId, photo } = req.body;
        let blog;

        try {
            blog = await Blog.findOne({ _id: blogId });
            if (!blog) {
                return res.status(404).json({ message: "Blog not found" });
            }
        } catch (error) {
            return next(error);
        }

        if (photo) {
            let previousPhoto = blog.photoPath.split("/").pop();

            // Delete previous photo
            try {
                fs.unlinkSync(`storage/${previousPhoto}`);
            } catch (error) {
                return next(error);
            }

            // Upload new photo
            const buffer = Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""), 'base64');
            const imagePath = `${Date.now()}-${author}.png`;

            // Save locally
            try {
                fs.writeFileSync(`storage/${imagePath}`, buffer);
            } catch (error) {
                return next(error);
            }

            await Blog.updateOne(
                { _id: blogId },
                {
                    title,
                    content,
                    photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
                }
            );
        } else {
            await Blog.updateOne({ _id: blogId }, { title, content });
        }

        return res.status(200).json({ message: 'Blog updated' });
    },

    async delete(req, res, next) {
        // Validate ID
        // Delete blog
        // Delete comments on the blog

        const deleteBlogSchema = Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        });

        const { error } = deleteBlogSchema.validate(req.params);
        if (error) {
            return next(error);
        }

        const { id } = req.params;

        try {
            const blog = await Blog.findOne({ _id: id });
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            await Blog.deleteOne({ _id: id });
            await Comment.deleteMany({ blog: id });
        } catch (error) {
            return next(error);
        }

        return res.status(200).json({ message: 'Blog deleted' });
    }
}

module.exports = blogController;
