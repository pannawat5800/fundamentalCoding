
var express = require('express');
var bodyParser = require('body-parser');
var admin = require('firebase-admin');
var app = express();
var np = require('numjs');
var Training = require("./coffee_model");

/*
const tf = require('@tensorflow/tfjs');
const model = tf.sequential();
model.add(tf.layers.dense({units: 100, activation: 'relu', inputShape: [10]}));
model.add(tf.layers.dense({units: 1, activation: 'linear'}));
model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});

const xs = tf.randomNormal([100, 10]);
const ys = tf.randomNormal([100, 1]);

model.fit(xs, ys, {
  epochs: 100,
  callbacks: {
    onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log.loss}`)
  }
});
*/
var mapCoffee = [
    { name: "espresso", value: 00},
    { name: "mocha", value: 01},
    { name: "capuchino", value: 10},
    { name: "coco", value: 10},
]

var mapState_level= [
    {option: "very", value : 00},
    {option: "alittle", value : 01},
    {option: "favore", value: 11}
]

var mapIngredient = [
    {name:"coffee", value_search:['bitter'], value: 10},
    {name:"milk", value_search:['milk'] ,value: 00},
    {name:"sugar",value_search:['sweet'] , value: 01},
    {name:"coco", value_search:['coco'] ,value: 11}
]

function rangValue(value1, value2,option){
    let newValue = Math.abs(value1-value2)/2;
    switch(option){
        case 00:{
            return (value1 - newValue);
        }
        case 01:{
            return (value2 - newValue);
        }
        case 11:{
            return value2;
        }
    }
}


var mapCoffee = [
    { name: "espresso", value: 00},
    { name: "mocha", value: 01},
    { name: "capuchino", value: 10},
    { name: "coco", value: 10},
]

function adjustFavor(option, detail){

}




app.use(bodyParser.urlencoded({ extended: false}));
// parse application/json
app.use(bodyParser.json())
var y = [30, 25, 28, 30, 27, 35]
var x = [10, 9, 8, 7, 5, 6]
//linearEsstimation(x, y)

var serviceAccount = require('./service/smartcoffee-96d82-firebase-adminsdk-1hc3r-8743c4660c.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://smartcoffee-96d82.firebaseio.com",
    
});

var db = admin.database();

app.get('/api/login', function(req, res){
    var password = req.query.code
    console.log(password);
    var code = parseInt(password)

    var additionalClaims = {
        premiumAccount: true
    };

    var tokenID = "";
    
    admin.auth().createCustomToken(password, additionalClaims)
    .then(function(customToken) {
    // Send token back to client
        console.log(customToken)
        
        tokenID = customToken
    })
    .catch(function(error) {
    console.log("Error creating custom token:", error);
    });
    var ref = db.ref("Users").orderByChild("code").equalTo(password)
    ref.once("value", function(snapshot){
        console.log(snapshot.val())
        var users = new Array();
        snapshot.forEach(user =>{
            users.push({
                "key": user.key,
                "code": user.val().code,
                "token": tokenID
            })
        })
        res.json(users);  
    })    
});

app.post('/api/feedback', function(req, res){
    var feedback = req.body;
    let str_injection = feedback.order.state.split(" ")
    console.log(str_injection)
    let ingredient = null;
    mapIngredient.forEach(map =>{
        if(map.value_search.includes(str_injection[1])){
            ingredient = map
            //console.log(ingredient)
        }
    });

    // get info previous order
    let orderRef = db.ref("Orders").child(feedback.userkey).orderByChild('productID').equalTo(feedback.productID).limitToLast(2);
    orderRef.once('value', function(snapshot){
        if(snapshot.val() != null){
            console.log(snapshot.numChildren());''
            let state = mapState_level.find(x => x.option==str_injection[0]);
            let val_receiver = snapshot.val();
            let frontire = [];
            if(snapshot.numChildren() <=1){
                frontire[0] = 30
            }
            else{
                for(let list in snapshot.val()){
                    //console.log("lists item: " + val_receiver[list].productID);
                    frontire.push(val_receiver[list].ingredients[ingredient.name]);
                }
            }
            console.log("-------------------------------------------------");
            console.log('Input Data');
            console.log(`Order: ${feedback.order.name}`);
            console.log(`state:${state.value}, ingredient: ${ingredient.name}`);
            console.log(`frontier:${frontire}`);
            console.log("-------------------------------------------------");
            let training = new Training(state.value, ingredient.name, frontire, null);
            training.setDecrease();
            console.log('Output Data');
            console.log(training.getNewStateFlavor());
            console.log("-------------------------------------------------");
            
        }
    })
    res.json({message:"success"});
})
var orderList = new Array();
app.get('/api/orders', function(req, res){
    console.log(req.query.userID);
    var orderRef = db.ref("Orders").child(req.query.userID).orderByChild("confirm").equalTo(true)
    var productRef = db.ref("Products").child(req.query.userID);
    orderRef.once("value", function(snapshot){
        //console.log(snapshot.numChildren());
        console.log(snapshot.val());
        let count = 0;
        snapshot.forEach(function(order){
            var productID = order.val().productID
            productRef.child(productID).once("value", function(product){
                var v = {
                    name: product.val().name,
                    cost: product.val().cost,
                    type: product.val().type,
                    status: product.val().status,
                    orderID: order.key,
                    ...order.val()
                }
                //console.log(v)
                orderList.push(v)
                count++
                if(count === snapshot.numChildren()){
                    res.json(orderList);
                }
                //console.log(orderList)
            });
        });
    })
    
})
app.post('/api/orders', function(req, res){
    console.log(req.body)
    var ref = db.ref("Orders").child(req.body.userID).child(req.body.orderID)
    var milk = new Array();
    var coco = new Array();
    var index = new Array();
    ref.update({
        confirm: req.body.confirm
    }).then(() =>{
        res.json({message: "success"})
        var order = db.ref("Orders").child(req.body.userID).orderByChild("confirm").equalTo(true)
        order.once("value", function(snapshot){
           // console.log(snapshot.val())
           var count = 0;
            snapshot.forEach(data =>{
                //console.log(data.val().ingredients.milk)
                milk.push(data.val().ingredients.milk)
                coco.push(data.val().ingredients.coco)
                index.push(count)
                count++
            })
            console.log(milk)
            console.log(coco)
            linearEsstimation(index, milk, "milk")
            linearEsstimation(index, coco, "coco")
        });
    })
})
app.put('/api/orders', function(req,res){
    console.log(req.body)
    var ref = db.ref("Orders").child(req.body.userID)
    var date = new Date()
    ref.push({
        productID: req.body.productID,
        confirm: req.body.confirm,
        date: date.getTime(),
        ingredients: req.body.ingredients
    }).then(()=>res.json({message: "success"}))
})

app.get('/api/products', function(req,res){
    var uid = req.query.userID
    var ref = db.ref('Products').child(uid);
    productList = new Array();
    ref.once('value', function(snapshot){
        console.log(snapshot.val());
        snapshot.forEach(function(data){
            var product = {
                'key': data.key,
                ...data.val()
            }
            productList.push(product)
        });
        res.json(productList);
    });
})
app.post('/api/products', function(req, res){
    console.log(req.body)
    res.json({message: "success"})
})


function linearEsstimation(x, y, type)
{
    var xv = np.array(x);
    var yv = np.array(y);
    
    var xmean = xv.mean();
    var ymean = yv.mean();
    console.log(`Observe: ${type}`)
    //console.log(xmean)
    var num = 0
    var den = 0
    for(i = 0; i < xv.size; i++)
    {
        num += (xv.get(i)  - xmean) * (yv.get(i) - ymean)
        den += Math.pow((xv.get(i) - xmean),2)
    }

    var m = num/den
    c = ymean - m*xmean

    var rnum = 0
    var rden = 0
    for(i = 0; i < yv.size; i++)
    {
        var yp = m*xv.get(i) + c
        rnum +=  Math.pow((yp-ymean),2)
        rden += Math.pow(( yv.get(i) - ymean), 2)
    }
    rs2 = rnum/rden

    console.log(`slop: ${m}`)
    console.log(`constant: ${c}`)
    console.log(`R squrt: ${rs2}`)
    
    optionEsstimation(m, c, rs2)
    console.log("-------------------------")
}

function optionEsstimation(slop, constant, r2)
{
    if(r2 != null && slop === 0)
    {
        console.log("Mean user like flavor")
    }
    else if (r2 > 0.5 && slop != 0)
    {
        console.log("Not select")
    }
    else
    {
        console.log("More training");
    }
}

var server = app.listen(3000, function(){
    var host = server.address().address;
    var port = server.address().port;
    console.log("listen at http://%s:%s", host, port);
});


