import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import nodemailer from "nodemailer";
import notifier from "node-notifier";
import Razorpay from "razorpay";

const db = new pg.Client({
    user:"postgres",
    host:"localhost",
    database:"postgres",
    password:"851211",
    port:5432,
});

const transporter = nodemailer.createTransport({
  service:'gmail',
  auth: {
    user:'bookinghitk@gmail.com',
    pass:'feub bpde rkbc rfww'
  }
});


const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_Z8YgAD9JbioskU',
    key_secret: 'j8we70w4W1mZXaYazKmcfaWI',

});

var email='';
var password= 0;
db.connect();
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 1100;
app.use(express.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/public/login.html");
});

app.get('/orders',async (req,res)=>{
    const query  = await db.query('SELECT fooditem, SUM(quantity) as count FROM orders WHERE status=($1) GROUP BY fooditem',['pending']);
    if(query){
        res.render('demand.ejs', { orders: query.rows });
    }else{
        console.log('Error',err.stack);
    }
});


app.post("/submit-login", async (req,res)=>{
    email =  req.body["email"];
    password =  req.body["password"];
    try{
        const data = db.query("SELECT * FROM userdata",(err,res1)=>{
            if(err){
                console.error("Error executing query",err.stack);
                 res.sendFile(__dirname+"/public/login.html");
            }else{
                let eVal = [];
                let pass = [];
                res1.rows.forEach((data1)=>{
                    eVal.push(data1.email);
                    pass.push(data1.password);
                });

                let flag = false;
                eVal.forEach((val)=>{
                  if (email===val){
                    flag=true;
                  }
                });
                let flag1 = false;
                pass.forEach((val1)=>{
                  if (password==val1){
                    flag1=true;
                  }
                });
                if(flag==true && flag1==true){
                 res.sendFile(__dirname+"/homepage.html");
                 notifier.notify({
                    title: 'My notification',
                    message: 'Successfully logged in!'
                  });
                  const mailOptions = {
                    from: 'bookinghitk@gmail.com',
                    to: email,
                    subject: 'Logged In',
                    text: `It's glad to see you here again!`
                };
      
                try {
                    transporter.sendMail(mailOptions);
                    console.log("Logged in.");
                } catch (error) {
                    console.log('Error sending email:', error.message);
                }
                }else{
                  res.sendFile(__dirname+"/public/login.html");
                  notifier.notify({
                    title: 'My notification',
                    message: 'Invalid Crediantials!'
                  });
                }
            }
        });
    }
    catch(err){
        console.error("Error executing query",err.stack);
        res.sendFile(__dirname+"/public/login.html");
    }
});

app.get("/signup",(req,res)=>{
    res.sendFile(__dirname+"/public/signup.html");
});

app.post("/submit-signup",async (req,res)=>{
    try{
        email =  req.body["email"];
        password =  req.body["password"];
        try {
            db.query("INSERT INTO userdata (email,password) VALUES ($1,$2)",[email,password]);
            res.sendFile(__dirname+"/homepage.html");
            notifier.notify({
                title: 'My notification',
                message: 'Successfully logged in!'
              });
              const mailOptions = {
                from: 'bookinghitk@gmail.com',
                to: email,
                subject: 'Successfull Register',
                text: `Thank you for joining us.It's our great pleasure to have you here.`
            };
  
            try {
                await transporter.sendMail(mailOptions);
                console.log("New Register.");
            } catch (error) {
                console.log('Error sending email:', error.message);
            }
        }
        catch(err){
            console.error("Error executing query",err.stack);
            res.sendFile(__dirname+"/public/signup.html");
            notifier.notify({
                title: 'My notification',
                message: 'Invalid Crediantials!'
              });
        }
    }
    catch(err){
        console.error("Error executing query",err.stack);
        res.sendFile(__dirname+"/public/signup.html");
    }
});

app.get("/home1",(req,res)=>{
    res.sendFile(__dirname+"/homepage.html");
});

app.get("/menu",(req,res)=>{
    res.sendFile(__dirname+"/menu.html");
});

app.post("/submit",(req,res)=>{
    var email = req.body["email_address"];
    console.log(email);
    res.sendFile(__dirname+"/homepage.html");
});

app.post('/send-data', async (req, res) => {
    console.log(req.body);
    const items = req.body.items;

    if (!items || !Array.isArray(items)) {
        console.log('No items found in the body.');
        return res.status(400).send('No items found in the request.');
    }

    try {
        let totalAmount = 0;
        for (const item of items) {
            const productId = item.product_id;
            const quantity = item.quantity;
            const foodResult = await db.query("SELECT price FROM food WHERE product_id = $1", [productId]);

            if (foodResult.rows.length === 0) {
                console.log(`No food item found for product_id: ${productId}`);
                continue;
            }

            const price = foodResult.rows[0].price;
            totalAmount += quantity * price * 100; // amount in paise
        }

        const options = {
            amount: totalAmount,
            currency: "INR",
            receipt: "receipt_order_" + Date.now(),
        };

        const order = await razorpayInstance.orders.create(options);
        console.log("Razorpay Order:", order);

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

        /*
        notifier.notify({
            title: 'My notification',
            message: 'Order Placed!'
        });
        */

        // Process each item (store in DB and send email)
        for (const item of items) {
            const productId = item.product_id;
            const quantity = item.quantity;
            const foodResult = await db.query("SELECT name, price FROM food WHERE product_id = $1", [productId]);

            if (foodResult.rows.length === 0) {
                console.log(`No food item found for product_id: ${productId}`);
                continue;
            }

            const { name, price } = foodResult.rows[0];
            const query = 'INSERT INTO orders (product_id, quantity, email, status, fooditem) VALUES ($1, $2, $3, $4, $5) RETURNING id';
            const values = [productId, quantity, email, 'pending', name];
            await db.query(query, values);

            const mailOptions = {
                from: 'bookinghitk@gmail.com',
                to: email,
                subject: 'Your Order is Created',
                text: `Thank you for your order! You have successfully placed an order of ${quantity} plate(s) ${name} for ${quantity * price} rupees. Enjoy your meal!`
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log("Email sent for order confirmation.");
            } catch (error) {
                console.log('Error sending email:', error.message);
            }

            // Prepare order status change after delay
            setTimeout(async () => {
                const preparedMailOptions = {
                    from: 'bookinghitk@gmail.com',
                    to: email,
                    subject: 'Your Order is Prepared',
                    text: `Your order of ${quantity} plate(s) ${name} has been prepared. Enjoy your meal!`
                };

                try {
                    await transporter.sendMail(preparedMailOptions);
                    console.log("Preparation email sent.");
                    await db.query("UPDATE orders SET status=$1 WHERE product_id=$2", ["completed", productId]);
                } catch (error) {
                    console.log('Error sending preparation email:', error.message);
                }
            }, 1 * 60 * 1000); // 1 minute delay
        }

    } catch (error) {
        console.error("Error creating Razorpay order or processing items:", error);
        if (!res.headersSent) res.status(500).send('Error creating payment order or processing items.');
    }
});


app.get("/contact",(req,res)=>{
    res.sendFile(__dirname+"/public/contact.html");
});

app.post("/contact",(req,res)=>{
    const { name , email , message } = req.body;
    console.log("Name:",name);
    console.log("Email:",email); 
    console.log("Message:",message);
    notifier.notify({
        title: 'My notification',
        message: 'Sent Successfully!'
      }); 
      res.sendFile(__dirname+"/homepage.html");
});

app.listen(port,()=>{
    console.log(`Server is running at port ${port}`);
});