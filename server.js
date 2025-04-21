import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import nodemailer from "nodemailer";
import notifier from "node-notifier";

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
    pass:'wegl qpwn kcvp kynj'
  }
});

var email='';
var password= 0 ;
db.connect();
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
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
  console.log(req.body); // This will show the entire body structure
  const items = req.body.items; // Accessing the items array
  notifier.notify({
      title: 'My notification',
      message: 'Order Placed!'
  });

  // Check if items is an array
  if (!items || !Array.isArray(items)) {
      console.log('No items found in the body.');
      return res.status(400).send('No items found in the request.');
  }

  try {
      // Process each item
      for (const item of items) {
          const productId = item.product_id;  // Accessing product_id
          const quantity = item.quantity;      // Accessing quantity

          // Insert order into the database
          const foodResult = await db.query("SELECT name, price FROM food WHERE product_id = $1", [productId]);
          const { name, price } = foodResult.rows[0];
          const query = 'INSERT INTO orders (product_id, quantity, email,status,fooditem) VALUES ($1, $2, $3, $4, $5) RETURNING id';
          const values = [productId, quantity, email,'pending',name]; // Ensure 'email' is defined
          const insertResult = await db.query(query, values); // Await the query execution

          // Fetch food details
          if (foodResult.rows.length === 0) {
              console.log(`No food item found for product_id: ${productId}`);
              continue; // Skip this iteration if no food is found
          }
          console.log(`Order placed for ${quantity} ${name} of amount ${quantity * price} rupees.`);

          // Send order confirmation email
          const mailOptions = {
              from: 'bookinghitk@gmail.com',
              to: email,
              subject: 'Your Order is Created',
              text: `Thank you for your order! You have successfully placed an order of ${quantity} plate ${name} for ${quantity * price} rupees. Enjoy your meal!`
          };

          try {
              await transporter.sendMail(mailOptions);
              console.log("Email sent successfully for order preparation.");
          } catch (error) {
              console.log('Error sending email:', error.message);
          }

          // Send prepared email after a delay
          setTimeout(async () => {
              const preparedMailOptions = {
                  from: 'bookinghitk@gmail.com',
                  to: email,
                  subject: 'Your Order is Prepared',
                  text: `Thank you for your order! Your order of ${quantity} plate ${name} has been prepared. Enjoy your meal!`
              };

              try {
                  await transporter.sendMail(preparedMailOptions);
                  console.log("Email sent successfully for completion of order");
                  db.query("UPDATE orders SET status=($1) WHERE product_id=($2)",["completed",productId]);
              } catch (error) {
                  console.log('Error sending email:', error.message);
              }
          }, 1 * 60 * 1000); // 5 minute delay
      }

      // Send a final response after processing all items
      res.status(201).send('Data saved successfully!');

  } catch (error) {
      console.error("Error processing orders:", error);
      res.status(500).send('Error processing orders.');
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