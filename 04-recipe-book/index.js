const express = require('express');
require('dotenv').config();
const cors = require('cors'); // cors = cross origin resources sharing
const { connect } = require('./db')
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')

function generateAccessToken(id) {
    // first parameter of jwt.sign: the payload/claims
    // second parameter is the token secret
    // third parameter is the config
    return jwt.sign({
        user_id: id,
        role: "member"
    }, process.env.TOKEN_SECRET, {
        expiresIn: '3w'
    })
}

// 1. create express application
const app = express();

// 2. provide some settings
app.use(express.json()); // allows us to send json responses and recieve json requests
app.use(cors()); // enable CORS if it is a public API

async function main() {

    const db = await connect(process.env.MONGO_URI, "rocket02_recipe_book");

    app.get('/health', function (req, res) {
        res.send("Still alive");
    })

    app.get('/', function (req, res) {
        res.send("Ok")
    });

    // For RESTFUL API, there's a convention in naming the URLs
    // each endpoint is also sometimes known as a resource
    // in short, each URL is like a path to a file
    // we use query string to tell the endpoint what criteria the client wants
    // search by tags, cuisine, ingredients, name
    // for example ?tags=pasta&cuisine=italian
    app.get('/recipes', async function (req, res) {

        // instead of:
        // const tags = req.query.tags;
        // const cuisine = req.query.cuisines;
        // const ingredients = req.query.ingredients;
        // const name = req.query.name;
        // we can do array destructuring:
        const { tags, cuisine, ingredients, name } = req.query;

        const critera = {

        }

        if (cuisine) {
            critera["cuisine.name"] = { $regex: cuisine, $options: 'i' }
        }


        // assume the tags a comma delimited string
        // example: quick,easy
        if (tags) {
            // "quick,easy".split(",") => ["quick", "easy"]
            // "quick|easy".split("|") => ["quick, "easy"]
            const tagsArray = tags.split(',');
            critera["tags.name"] = { $all: tagsArray }
        }

        if (name) {
            critera.name = { $regex: name, $options: 'i' };
        }

        if (ingredients) {
            //    let regexArray = [];
            //    for (let eachIngredient of ingredients.split(',')) {
            //     regexArray.push( new RegExp(eachIngredient, 'i'))
            //    }
            //    critera['ingredients.name'] = {
            //       $all: regexArray

            critera['ingredients.name'] = ingredients.split(',').map(function (eachIngredient) {
                return new RegExp(eachIngredient, "i")
            })
        }

        const recipes = await db.collection("recipes").find(critera).toArray();
        res.json({
            "recipes": recipes
        })
    })

    // req.body should contain: name, cuisine, prepTime, cookTime, servings, ingredients, instructions, tags
    // ingredients must be an array of ingredient objects: [ {name, amount, unit}]
    // tags must be an array of strings
    app.post('/recipes', async function (req, res) {

        try {

            const { name, cuisine, ingredients, instructions, tags, cookTime, prepTime, servings } = req.body
            if (!name || !cuisine || !ingredients || !instructions || !tags) {
                return res.status(400).json({
                    'error': 'Missing required fields'
                })
            }

            // check if the cuisine is valid
            const cuisineDoc = await db.collection('cuisines').findOne({
                name: { $regex: cuisine, $options: 'i' }
            })
            if (!cuisineDoc) {
                return res.status(400).json({
                    "error": "Invalid cuisine"
                })
            }

            // check if prep time must be than 0
            if (prepTime <= 0) {
                return res.status(400).json({
                    'error': 'Prep time cannot be less than 0'
                })
            }

            // check if cooktime is more than 0
            if (cookTime <= 0) {
                return res.status(400).json({
                    'error': 'Cook time cannot be less than 0'
                })
            }

            // servings must be more than 0
            if (servings <= 0) {
                return res.status(400).json({
                    'error': 'Servings must be more than 0'
                })
            }

            // make sure the given tags exist
            const tagDocs = await db.collection('tags').find({
                name: { $in: tags }
            }).toArray();
            if (tagDocs.length !== tags.length) {
                return res.status(400).json({
                    'error': "There are some invalid tags"
                })
            }

            const newRecipe = {
                name,
                cuisine: cuisineDoc,
                prepTime,
                cookTime,
                servings,
                ingredients,
                instructions,
                tags: tagDocs
            }

            // insert into the database
            const result = await db.collection("recipes").insertOne(newRecipe);
            res.json({
                'message': 'Recipe inserted successfully',
                recipeId: result.insertedId
            })
        } catch (e) {
            console.error(e);
            return res.status(500).json({
                'error': "Unable to insert new record"
            })
        }

    })

    app.delete('/recipes/:id', async function (req, res) {
        try {
            const recipeId = req.params.id;
            const result = await db.collection('recipes').deleteOne({
                _id: new ObjectId(recipeId)
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    'error': 'Not found'
                })
            }

            res.json({
                'message': 'The recipe has been deleted'
            })

        } catch (e) {
            console.error(e);
            res.status(500).json({
                error: "Unable to delete"
            })
        }
    })

    app.put('/recipes/:id', async function (req, res) {

        try {
            const { name, cuisine, ingredients, instructions, tags, cookTime, prepTime, servings } = req.body
            if (!name || !cuisine || !ingredients || !instructions || !tags) {
                return res.status(400).json({
                    'error': 'Missing required fields'
                })
            }

            // check if the cuisine is valid
            const cuisineDoc = await db.collection('cuisines').findOne({
                name: { $regex: cuisine, $options: 'i' }
            })
            if (!cuisineDoc) {
                return res.status(400).json({
                    "error": "Invalid cuisine"
                })
            }

            // check if prep time must be than 0
            if (prepTime <= 0) {
                return res.status(400).json({
                    'error': 'Prep time cannot be less than 0'
                })
            }

            // check if cooktime is more than 0
            if (cookTime <= 0) {
                return res.status(400).json({
                    'error': 'Cook time cannot be less than 0'
                })
            }

            // servings must be more than 0
            if (servings <= 0) {
                return res.status(400).json({
                    'error': 'Servings must be more than 0'
                })
            }

            // make sure the given tags exist
            const tagDocs = await db.collection('tags').find({
                name: { $in: tags }
            }).toArray();
            if (tagDocs.length !== tags.length) {
                return res.status(400).json({
                    'error': "There are some invalid tags"
                })
            }

            const updatedRecipe = {
                name,
                cuisine: cuisineDoc,
                prepTime,
                cookTime,
                servings,
                ingredients,
                instructions,
                tags: tagDocs
            }

            console.log(updatedRecipe);

            const results = await db.collection('recipes').updateOne({
                _id: new ObjectId(req.params.id)
            },
                { $set: updatedRecipe }
            )

            if (results.matchedCount === 0) {
                return res.status(400).json({
                    'error': 'Not found'
                })
            }

            res.json({
                'message': 'Recipe has been updated'
            })

        } catch (e) {
            console.error(e);
            res.status(500).json({
                'error': 'Cannot update'
            })
        }





    })

    /**
     * req.body.email: email address of the user
     * req.body.password: password of the user
     */
    app.post('/users', async function (req, res) {
        const password = await bcrypt.hash(req.body.password, 12);
        const email = req.body.email;
        // TODO: reject if the email is already in use

        const result = await db.collection('users').insertOne({
            email, password
        });
        res.status(201).json({
            'message': 'New user has been created',
            result
        })

    })

    // req.body.email = email of the user logging in
    // req.body.password = password of the user logging in
    app.post('/login', async function (req, res) {
        // const req.body.email = req.body.email;
        // const req.body.password = req.body.password;
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            })
        }

        // find the user by the given email address
        const user = await db.collection("users").findOne({
            email
        });
        if (user) {
            // check if the password
            // first parameter of compare must be the plaintext
            // second parameter is the hashed version
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    error: "Invalid credentials"
                })
            }
            // TODO: create a JWT and send back to the client
            const accessToken = generateAccessToken(user._id);
            res.json({
                accessToken
            })

        } else {
            // if email is not found
            return res.status(401).json({
                error: "Invalid credentials"
            })
        }

    })

    // req and res - same as the one for the route function
    // next will be a function that calls the next middleware, or if there's no middleware
    // left to be call, call the function
    function verifyToken(req, res, next) {
        const authorization = req.headers.authorization;
        const accessToken = authorization.split(" ")[1];
        if (!accessToken) {
            return res.sendStatus(401);
        }

        // use jwt.verify to test if the signature matches the hash of the payload + config
        jwt.verify(accessToken, process.env.TOKEN_SECRET, function (err, payload) {
            if (err) {
                return res.sendStatus(403)
            }

            // you can add to the request in a middleware
            // once the payload is added to req, the route can access it as the `user` key
            req.user = payload;
            next(); // this middleware is successfully (i.e no problem), call the next middleware
        });
    }

    app.get('/profile',[verifyToken], async function (req, res) {
        const user = req.user;
        res.json({
            "message":"private profile is accessed",
            user
        })
    })

    app.post('/checkout', [verifyToken], async function(req,res){
        res.json({
            'message':'Mock shopping cart checkout'
        })
    })

}
main();



app.listen(3000, function () {
    console.log("Server has started");
})