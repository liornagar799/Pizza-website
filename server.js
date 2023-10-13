const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const mysql = require('mysql');
//לנתח נתוני טופס נכנסים המקודדים בכתובת URL
//false - שימוש בספריית ברירת המחדל
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//מספק כלי עזר לעבודה עם נתיבי קבצים וספריות באופן עצמאי ללא פלטפורמה
const path = require('path');
const { log } = require('console');


// Create a MySQL database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "LN9580797",
    database: "pizza"
});


// Serve static files from the "public" directory
app.use(express.static('public'));

// Serve images from the "images" directory
app.use('/images', express.static('images'));

// Serve the HTML file
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'views/home.html');
    res.sendFile(filePath);
});

// מעבר לדף אדמין 
app.get('/go-order', (req, res) => {
    const filePath = path.join(__dirname, 'views/order.html');
    res.sendFile(filePath);
});

// מעבר לדף סטטוס
app.get('/Status', (req, res) => {
    const filePath = path.join(__dirname, 'views/Status.html');
    res.sendFile(filePath);
});

// משתנה שבו ישמרו נתוני ההזמנה
var orderData = {
  orderNumber: "",
  customerName: "",
  orderStatus: "",
  pizzaSize: "",
  olives: "",
  onion: "",
  parmesan: "",
  tomatoes: "",
  mozzarella: "",
  price: 0,
  startTime: "",
  lastComment: ""
};

// ----------------------------------פונקציית לבדיקת התחברות אדמין ---------------------------------------

// מעבר לדף אדמין
app.get('/Admin', (req, res) => {
    // Access the query parameters sent from the client
    const emailAdmin = req.query.emailAdmin;
    const password = req.query.password;

// פונקציה לבדיקת התחברות
function checkLogin(email, password, callback) {
    const sql = "SELECT * FROM `admins-table` WHERE Email = ? AND Password = ?";
    db.query(sql, [email, password], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        
        // מחזיר אם נמצאה התאמה 
        callback(null, result.length > 0);
    });
  }

  // קריאה לפונקציה שמתחברת למסד
  checkLogin(emailAdmin, password, (err, isAuthenticated) => {
    if (err) {
        console.error('eror', err);
    } else {
        if (isAuthenticated) {
           // אם יש התאמה מעביר לדף של האדמין
            const filePath = path.join(__dirname, 'views/admin.html');
            res.sendFile(filePath);
        }
    }
  });
});

// --------------------------------------------הוספת הזמנה חדש ------------------------------------------------

app.get('/add-data', (req, res) => {
  
    const customerName = req.query.customerName;
    const orderStatus = req.query.orderStatus;
    const pizzaSize = req.query.pizzaSize;
    const olives = req.query.olives;
    const onion = req.query.onion;
    const parmesan = req.query.parmesan;
    const tomatoes = req.query.tomatoes;
    const mozzarella = req.query.mozzarella;
    const price = req.query.price;
    var lastComment = req.query.lastComment+ "";
     // Get the start time when the page is loaded
     var startTime = new Date();
    
        orderData.customerName= customerName;
        orderData.orderStatus= orderStatus;
        orderData.pizzaSize=pizzaSize;
        orderData.olives= olives;
        orderData.onion= onion;
        orderData.parmesan= parmesan;
        orderData.tomatoes= tomatoes;
        orderData.mozzarella= mozzarella;
        orderData.price= price;
        orderData.startTime= startTime;
        orderData.lastComment= lastComment;
  

    add_order(orderData, orderData.customerName);

    function add_order(orderData, clientName) {
    
         // מבצע שאילתא למשיכת מספר ההזמנה הבא, שלא יהיה כפילויות
          const sqlQuery = 'SELECT num FROM `numorder` WHERE `name` = ?';
          const sqlval = ["count"];
      
         // Execute the query
          db.query(sqlQuery, sqlval, (err, results) => {
            if (err) {
              console.error('Error executing the query: ' + err.message);
              db.end();
              return;
            }
            
            const firstResult = results[0];
            if (!firstResult || typeof firstResult.num !== 'number') {
              console.error('No valid number found in the result.');
              db.end();
              return;
            }
             
            const num = firstResult.num;
        
        
      // ביצוע השאילתא להוספת הזמנה חדשה
      const sql = 'INSERT INTO `orders-table` (`Order Number`, `Customer Name`, `Order Status`, `Pizza Size`, `Olives`, `Onion`, `Parmesan`, `Tomatoes`, `Mozzarella`, `Price`, `StartTime`, `LastComment`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [
        num, // מספר ההזמנה שקיבלנו
        clientName,
        orderData.orderStatus,
        orderData.pizzaSize,
        orderData.olives,
        orderData.onion,
        orderData.parmesan,
        orderData.tomatoes,
        orderData.mozzarella,
        orderData.price,
        orderData.startTime,
        orderData.lastComment
      ];
      
          db.query(sql, values, (err, result) => {
              if (err) {
                console.error('Error inserting order: ' + err.stack);
              } else {
                console.log('Order inserted successfully');
              }
           
                  //עידכון מספר ההזמנה החדש הפנוי בדאתא בייס 
                  const updatesql = 'UPDATE `numorder` SET num = ? WHERE `name` = ?';
                  const upvalues = [num + 1, "count"];
        
                  db.query(updatesql, upvalues, (err, result) => {
                    if (err) {
                      console.error('Error updating order: ' + err.stack);
                    } else {
                      console.log('Order updated successfully numOrder');
                    }
                    orderData.orderNumber = num;
                    res.send(""+num);
                   
                  });
          });
        });
      } 
});

// ------------------------------------------------קבל את ההזמנה הבאה -------------------------------------------------

app.get('/nextOrder', (req, res) => {
// Function to get the next order to be started
function get_next_order(callback) {
  
      // SQL query to select the order with the earliest "Received" status
      const sql = 'SELECT * FROM `orders-table` WHERE `Order Status` = ? ORDER BY startTime LIMIT 1';
      const values = ['Received'];
  
      db.query(sql, values, (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          if (result.length > 0) {
            callback(null, result[0]);
          } else {
            callback(null, null);
          }
        }
      });
  }
  
  get_next_order((err, nextOrder) => {
    if (err) {
      console.error('Error:', err);
    } else {
      if (nextOrder) {
      
         // ההזמנה החוזרת
         var responseText = `
         Order Number: ${nextOrder['Order Number']}<br>
         Customer Name: ${nextOrder['Customer Name']}<br>
         Order Status: ${nextOrder['Order Status']}<br>
         Pizza Size: ${nextOrder['Pizza Size']}<br>
         Olives: ${nextOrder['Olives']}<br>
         Onion: ${nextOrder['Onion']}<br>
         Parmesan: ${nextOrder['Parmesan']}<br>
         Tomatoes: ${nextOrder['Tomatoes']}<br>
         Mozzarella: ${nextOrder['Mozzarella']}<br>
         Price: ${nextOrder['Price']}<br>
         StartTime: ${nextOrder['StartTime']}<br>
         LastComment: ${nextOrder['LastComment']}<br>
         `;
         // שליחת ההזמה לדף
         res.send(responseText);
        } else {
        res.send('No orders with "Received" status found.');
      } 
    }
  });
});


// -----------------------------------------------עידכון הזמנה ---------------------------------------------

app.get('/update', (req, res) => {

    const pizzaSize1 = req.query.pizzaSize;
    const olives1 = req.query.olives;
    const onion1 = req.query.onion;
    const parmesan1 = req.query.parmesan;
    const tomatoes1 = req.query.tomatoes;
    const mozzarella1 = req.query.mozzarella;
    const price1 = req.query.price;

    orderData.pizzaSize = pizzaSize1;
    orderData.olives = olives1;
    orderData.onion = onion1;
    orderData.parmesan = parmesan1;
    orderData.tomatoes = tomatoes1;
    orderData.mozzarella = mozzarella1;
    orderData.price = price1;

update_order(orderData.orderNumber, orderData);

  // Function to update an order in the database
function update_order(orderNumber, orderData) {

 // Update the order in the database
 const sql = 'UPDATE `orders-table` SET `Pizza Size` = ?,`Olives` = ?, `Onion` = ?, `Parmesan` = ?, `Tomatoes` = ?, `Mozzarella` = ?, `Price` = ? WHERE `Order Number` = ?';

 const values = [
   orderData.pizzaSize,
   orderData.olives,
   orderData.onion,
   orderData.parmesan,
   orderData.tomatoes,
   orderData.mozzarella,
   orderData.price,
   orderNumber
 ];

 db.query(sql, values, (err, result) => {
   if (err) {
     console.error('Error updating order: ' + err.stack);
   } else {
     console.log('Order updated successfully');
   }

 });
}
});


// --------------------------------------------שנה סטטוס להזמנה ------------------------------------------------

app.get('/changeStatus', (req, res) => {

  const orderID = req.query.orderID; 
  const newStatus = req.query.newStatus;


// Function to change the order status
function change_order_status(orderNumber, desiredStatus, callback) {
 

    // Update the order status in the database
    const sql = 'UPDATE `orders-table` SET `Order Status` = ? WHERE `Order Number` = ?';
    const values = [desiredStatus, orderNumber];

    db.query(sql, values, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, 'Order status changed successfully');
      }
      });
}


change_order_status(orderID, newStatus, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(result); // Success message or error message
  }
});
});

// --------------------------------------- מידע פיננסי -----------------------------------------------------

app.get('/getDailyRevenue', (req, res) => {
  const date = req.query.date;
  // Function to get the daily revenue for a given date
function daily_revenue_report(date, callback) {

    // SQL query to calculate daily revenue
    const sql = 'SELECT SUM(Price) AS dailyRevenue FROM `orders-table` WHERE DATE(startTime) = ?;';

    db.query(sql, [date], (err, result) => {
      if (err) {
        console.error('Error calculating daily revenue: ' + err.stack);
        callback(err, null);
      } else {
        console.log('Daily revenue calculated successfully');
        const dailyRevenue = result[0].dailyRevenue || 0;
        callback(null, dailyRevenue);
      }
  });
}


daily_revenue_report(date, (err, revenue) => {
  if (err) {
    console.error('Error:', err);
  } else {
    //toFixed - מחזיר 2 אחרי הנקודה והופכת לסטרינה
    var string = 'Daily revenue for ' + date + ': ₪' + revenue.toFixed(2);
    res.send(string);
    console.log(string);
  }
});
});

// -------------------------------------------- סטטוס הזמנות------------------------------------------------

app.get('/orders_status', (req, res) => {
  

// Function to retrieve orders with specific statuses
function orders_status(callback) {

    // Calculate the timestamp for 15 minutes ago
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    // SQL query to retrieve orders with specific statuses
    const sql = "SELECT `Order Number`, `Customer Name`, `Order Status` FROM `orders-table` WHERE `Order Status` IN ('In Progress', 'Received') OR (`Order Status` = 'Finished' AND startTime >= ?) ORDER BY `Order Number` LIMIT 10";
    const values = [fifteenMinutesAgo];

    db.query(sql, values, (err, results) => {
      if (err) {
        console.error('Error retrieving order status: ' + err.stack);
        callback(err, null);
      } else {
        console.log('Orders status retrieved successfully');
        callback(null, results);
      }

  });
}

orders_status((err, orders) => {
  if (err) {
    console.error('Error:', err);
  } else {
    let formattedOrders = '';

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      formattedOrders += `Order Number:  ${order['Order Number']},`;
      formattedOrders += ` Customer Name:  ${order['Customer Name']},`;
      formattedOrders += ` Order Status:  ${order['Order Status']}`;
      formattedOrders += '\n'; 
    }

    res.send(formattedOrders);
  }
});

});

// -----------------------------------------קבלת מידע ללקוח כל 15 שניות ---------------------------------------------------

app.get('/order_update', (req, res) => {
  // קבל מספר הזמנה מהבקשה
 const ordernum = req.query.ordernum;
 console.log(ordernum);
  // SQL query לחיפוש הסטטוס של ההזמנה לפי מספר ההזמנה
  const sql = "SELECT `Order Status` FROM `orders-table` WHERE `Order Number` = ?";
  const values = [ordernum];

  // בצע את השאילתה למסד הנתונים
  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error retrieving order status: ' + err.stack);
      res.status(500).json({ error: 'Error retrieving order status' });
    } else {
      if (results.length > 0) {
        // החזר את הסטטוס שנמצא
        res.send(""+results[0]['Order Status'] );
      } else {
        // אם ההזמנה לא נמצאה, החזר הודעת שגיאה
        res.status(404).send({ error: 'Order not found' });
      }
    }
  });
});

// --------------------------------------------------------------------------------------------
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});