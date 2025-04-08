const express = require('express');
const app = express();
const mongoose = require('mongoose');
const {User} = require('./model/User');
const morgan = require('morgan');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {Product} = require('./model/Product');
const {Cart} = require('./model/Cart');

//middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());



mongoose.connect('mongodb+srv://arthabagi62:VcSvOKuBNe0ytWAh@cluster0.fedxc3b.mongodb.net/?retryWrites=true&w=majority&')
.then(()=>{
    console.log("db is connected")
})
.catch((error)=>{
    console.log("db is connected",error)
})

//task-1 create route for register user
app.post('/register',async(req,res)=>{
    try{
        let {name,email,password} = req.body;
        
        //check if any field is missing

        if(!email || !name || !password){
            res.status(400).json({
                message:"Field is missing"
            });
        }
        //check if user allready have an account
        const user = await User.findOne({email});

        if(user){
            return res.status(400).json({
                message:"user aldready has a account"
            });
        }else{

            // hash the password -> secure password
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(password,salt);

            //user authentication
            const token = jwt.sign({email},"supersecret",{expiresIn:'365d'});

            //create user in database
            await User.create({
                name,
                password : hashedPassword,
                email,
                token,
                role:'user'
            });

            return res.status(200).json({
                message:" User created successfully"
            });
        }
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//task-2 create route for login
app.post('/login',async(req,res)=>{
    try{
        let {email,password} = req.body;

        //check all fields are there or not
        if(!email || !password){
            return res.status(400).json({
                message: "Field is missing"
            });
        }
        //checking user having account
        const user = await User.findOne({email});

        if (!user){
            return res.status(400).json({
                message : "user not registered"
            });
        }
        //compare password with the stored password
        const isMatchedPassword = bcrypt.compareSync(password, user.password)
        if(!isMatchedPassword){
            return res.status(400).json({
                message : "password is wrong"
            })
        }

        return res.status(200).json({
            message:"user logged in successfully",
            id: user._id,
            name: user.name,
            token: user.token,
            email : user.email,
            role : user.role
        });

    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//task-3 create route to see all product
app.get('/products',async(req,res)=>{
    try{
        //let {name, price, stock, brand, image, description} = req.body;
        const products = await Product.find();
        res.status(200).json({
            message : "products found sucessfully",
            products : products
        });
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
    
});

//task-4 create route to add product
app.post('/add-product',async(req,res)=>{
    try{
        let {name,image,description,stock,brand,price}= req.body;
        const {token} = req.headers;
        const decodedToken = jwt.verify(token,"supersecret");
        const user = await User.findOne({email : decodedToken.email});
        const product = await Product.create({
            name,
            stock,
            price,
            image,
            description,
            brand,
            user:user._id
        });
        return res.status(200).json({
            message:"Product created successfully",
            product:product
        });
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//task-5 create route to particular product
app.get('/product/:id',async(req,res)=>{
    try{
        let {id} = req.params;
        if(!id){
            return res.status(400).json({
                message: "product id not found"
            });
        }
        let {token} = req.headers;
        const decodedToken = jwt.verify(token,"supersecret");
        if(decodedToken.email){
            const product = await Product.findById(id);

            if(!product){
                res.status(400).json({
                    message:"product not found"
                });
            }
            return res.status(200).json({
                message:"product found successfully",
                product
            });
        }
    }catch(error){
        console.log(error);
        res.status(400).json({
            message:"Internal server error"
        });
    }
});

//task-6 create route to update product
// task-6: Update product
app.patch("/product/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { token } = req.headers;
  
    // Destructure the fields that are coming in the request body
    const { name, description, image, price, brand, stock } = req.body.productData;
    const decodedToken = jwt.verify(token, "supersecret");
    try {
      if (decodedToken.email) {
        // Find the product by ID and update it
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          {
            name,
            description,
            image,
            price,
            brand,
            stock,
          });
          res.status(200).json({
            message:"product updated",
            product:updatedProduct
          });
        }
    } catch (error) {
      console.log(error);
      res.status(400).json({
        message: "Internal server error",
      });
    }
  });
//task-7 route to delete
app.delete('/product/delete/:id',async(req,res)=>{
    try{
        let {id} = req.params;
        if (!id){
            return res.status(400).json({
                message:"id not found"
            })
        }
        let deletedProduct = await Product.findByIdAndDelete(id);
        if(!deletedProduct){
            return res.status(400).json({
                message:"product not found"
            })
        }
        return res.status(200).json({
            message:"product deletd succesfully",
            product:deletedProduct
        })
    }catch (error) {
      console.log(error);
      res.status(400).json({
        message: "Internal server error",
      });
    }
})

//task-8 route to see all products in cart
app.get('/cart', async(req,res)=>{
    try{
        let {token} = req.headers;
        const decodedToken = jwt.verify(token, "supersecret")
        const user = await User.findOne({email:decodedToken.email}).populate({
            path: 'cart',
            populate:{
                path: 'products',
                model: 'Product'
            },
        });
        if(!user){
            return res.status(400).json({
                message: "User not found"
            })
        }
        return res.status(200).json({
            cart: user.cart
        });
    }catch(error) {
      res.status(400).json({
        message: "Internal Server Error",
      });
    }
  })

  //task-9 create route to add product in cart
  app.post('/cart/add', async(req,res)=>{
    try{
        const body = req.body;
        //getting product if from frontend
        const productsArray = body.products;
        let totalPrice = 0;

        //find the product and add product price in total
        for(let item of productsArray){
            const product = await Product.findById(item);
            if(product){
                totalPrice += product.price;
            }
        }
        const {token} = req.headers;
        const decodedToken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedToken.email});
        if(!user){
            return res.status(400).json({
                message: "User not found"
            })
        }

        //checking if user already has a cart
        let cart;
        if(user.cart){
            cart = await Cart.findById(user.cart).populate('products');
            const existingProductIds = cart.products.map((product)=>{
                product._id.toString()
            });

            //if product is not already in the cart, add it to cart
            productsArray.forEach(async(productId)=>{
                if(!existingProductIds.includes(productId)){
                    cart.products.push(productId);
                    const product = await Product.findById(productId);
                    totalPrice += product.price;
                }
            })
            //updating cart.total with the new total price
            cart.total = totalPrice;
            await cart.save();
        }else{
            //create new cart
            cart  = new Cart({
              products:productsArray,
              total: totalPrice  
            })
            await cart.save();
            user.cart = cart._id;
            await user.save();
        }
        return res.status(200).json({
            message: "product added to cart successfully",
            cart: cart ,
        })
    }catch(error) {
      res.status(400).json({
        message: "Internal Server Error",
      });
    }
  })

 //task-10 create route to delete in cart
 app.delete('/cart/product/delete',async(req,res)=>{
    try{
        const {productID} = req.body;
        const {token} = req.headers;
        const decodedToken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedToken.email}).populate("cart");
        if(!user){
            return res.status(404).json({
                message: "User not found"
            })
        }
        const cart = await Cart.findById(user.cart).populate("products");
        if(!cart){
            return res.status(404).json({
                message: "Cart not found"
            })
        }
        const productIndex = cart.products.findIndex(
            (product)=> product._id.toString() === productID
        )
        if(productIndex === -1){
            return res.status(404).json({
               message: "product not found in cart" 
            })
        }
        cart.products.splice(productIndex, 1);
        cart.total = cart.products.reduce(
            (total, product)=> total + product.price,
            0
        );
        await cart.save();
        return res.status(200).json({
            message:"Product deleted from cart successfully",
            cart: cart
        })
    }catch(error) {
      res.status(400).json({
        message: "Internal Server Error",
      });
    }
  })



let PORT = 8080;
app.listen(PORT,()=>{
    console.log(`server is connected to port ${PORT}`)
})