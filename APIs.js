var Web3 = require('web3');
var Eth = require('web3-eth');
var eth = new Eth(Eth.givenProvider || 'https://ropsten.infura.io/1fRpT5XjlePDzwsm3mkR');
var web3;
var crypto = require('crypto');
const util = require('util');
var Tx = require('ethereumjs-tx');
var config = require('./config.js');
var helper = require('./helper.js');
var request = require('request');
var mysql = require('mysql');
var httpBuildQuery = require('http-build-query');

if(typeof web3 !== 'undefined') {
	web3 = new Web3(web3.currentProvider);
}else{
	//web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/1fRpT5XjlePDzwsm3mkR'));
	web3 = new Web3(new Web3.providers.HttpProvider(config.web3Provider.testNet));
}

var connection = mysql.createConnection(config.connection);
connection.connect(function(err){
	if (err) throw err
	//console.log('You are now connected...')
});

var querySQL = {
	smartContract : "SELECT * FROM `smartcontract` WHERE `SmartContractID`=?"
};


/*var TokenContract = new web3.eth.Contract(config.smartcontract.tokenContract.abi, config.smartcontract.tokenContract.address);
var IcoContract = new web3.eth.Contract(config.smartcontract.icoContract.abi, config.smartcontract.icoContract.address);
var IcoPhase = new web3.eth.Contract(config.smartcontract.icoPhase.abi, config.smartcontract.icoPhase.address);
var IcoBonus = new web3.eth.Contract(config.smartcontract.icoBonus.abi, config.smartcontract.icoBonus.address);
*/

module.exports=function(app){
	
	app.get('/', function (req, res) {
		res.send("API is Connected!");
	});

	app.get("/api/generaWallet",function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var value = (res.statusCode==200)? eth.accounts.create(web3.utils.randomHex(32)): null ;
		var privateKeyEncryption = helper.encrypt(config.keyRandom.key,value.privateKey);
		value.privateKey = privateKeyEncryption;
		res.send(helper.response(statusCode,message,value));
	});
	
	app.post('/api/encryptionPrivateKey',function(req,res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['key']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}

		var result = helper.encrypt(config.keyRandom.key,req.body.key);
		var value = (res.statusCode==200)? result : null ;

		res.send(helper.response(statusCode,message,value));
	})

	app.post('/api/descryptionPrivateKey', function (req, res) {
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['key']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}

		var result = helper.descrypt(config.keyRandom.key,req.body.key);
		var value = (res.statusCode==200)? result : null ;

		res.send(helper.response(statusCode,message,value));
	});

	app.post('/api/checkBalance', function(req,res){
		console.log('aaaa');
		var statusCode = (res.statusCode==200)? true : false;
		var isParameter=helper.isParameter(req.body, ['wallet']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		web3.eth.getBalance(req.body.wallet).then(function(log){
			var statusCode = (res.statusCode==200)? true : false;
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			var value = (res.statusCode==200)? web3.utils.fromWei(log,'ether') : null ;
			res.send(helper.response(statusCode,message,value));
		});
	});

	app.get('/api/encryptionKey', function (req, res) {
			var statusCode = (res.statusCode==200)? true : false;
			const secret = '7JSPT2tPUjke0jpGaL45';
			var isParameter=helper.isParameter(req.query, ['key']);
			if(isParameter.length>0){
				statusCode = 404;
				res.send("Missing Parameter: "+isParameter.toString());
			}
			const hash = crypto.createHmac('sha256', secret).update(req.query.key).digest('hex');
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			var value = (res.statusCode==200)? hash : null ;
			res.send(helper.response(statusCode,message,value));
		});
	
	app.get('/api/transactionETH', function (req, res) {
	var statusCode = (res.statusCode==200)? true : false;
	var isParameter=helper.isParameter(req.query, ['address']);
	if(isParameter.length>0){
		statusCode = 404;
		res.send("Missing Parameter: "+isParameter.toString());
	}
	
	var APILink = config.apiEtherscan.testNet;
	var queryString = httpBuildQuery({
	module:"account",
	action:"txlist",
	address:req.query.address,
	apikey:config.apiEtherscan.apikey
	});
	request(APILink+queryString, function (error, response, body) {
		if(!error && response.statusCode == 200) {
			var dataJson = JSON.parse(body);
			var i; 
			for(i=0;i<dataJson.result.length;i++){
				var log = web3.utils.fromWei(dataJson.result[i].value,'ether');
				dataJson.result[i].value = log;
			}
			res.send(dataJson);
		}
	    });
	});
	
	app.get('/api/getPhaseBonus', function (req, res) {
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			phaseBonus.methods.getCurrentPhase().call().then(result=>{
				var statusCode = (res.statusCode==200)? true : false;
				var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
				var value = (res.statusCode==200)? result : null ;
				res.send(helper.response(statusCode,message,value));
			});
		});
	});
	
	//aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

	// app.get("/api/generaWallet",function(req, res){
	// 	var statusCode = (res.statusCode==200)? true : false;
	// 	var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
	// 	var value = (res.statusCode==200)? eth.accounts.create(web3.utils.randomHex(32)) : null ;
	// 	// var obj = JSON.parse(value);

	// 	// var obj = JSON.parse(valu);
	// 	// var privateKeyNotEncrytion = json.Value.privateKey;
	// 	// var privateKeyEncryption = helper.encrypt(key,json.Value.privateKey);
	// 	// console.log(privateKeyEncryption);
	// 	// var obj = JSON.parse(privateKeyEncryption);
	// 	// obj['Value'].push({"privateKeyEncryption":privateKeyEncryption});
	// 	// jsonStr = JSON.stringify(obj);

	// 	res.send(helper.response(statusCode,message,value));
	// });
	
	
	/*
	app.get('/api/getBalance', function (req, res) {
		//console.log("aaa");

		var isParameter=helper.isParameter(req.query, ['currency',"address"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}

		var currency = req.query.currency,
		address = req.query.address;
		if(currency=="eth"){
			var balance = web3.eth.getBalance(address);
			balance.then(function(value){
				var statusCode = (res.statusCode==200)? true : false;
				var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
				var value = (res.statusCode==200)? web3.utils.fromWei(value,'ether') : null ;
				res.send(helper.response(statusCode,message,value));
			});
			}if(currency=="cgn"){
			TokenContract.methods.balanceOf("0xEf5e98DE54c63700749eCEE7f30948C103B3756C").call().then(result=>{
				var statusCode = (res.statusCode==200)? true : false;
				var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
				var value = (res.statusCode==200)? web3.utils.fromWei(result,'ether') : null ;
				res.send(helper.response(statusCode,message,value));
			});
		}
	});
	*/
	/*Phase API*/
	/*
	app.post("/api/setPhasePresale",function (req, res) {
		var isParameter=helper.isParameter(req.body, ['from',"to"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
			}else{
			var funcData =	IcoPhase.methods.setPhasePresale(req.body.from,req.body.to).encodeABI();
			var statusCode = (res.statusCode==200)? true : false;
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			sendSignedTransaction(config.smartcontract.icoPhase.owner.address, config.smartcontract.icoPhase.address, config.smartcontract.icoPhase.owner.privateKey, funcData).then(result=>{
				res.send(helper.response(statusCode,message,result));
			});
		}
	});
	app.post("/api/setPhasePublicSale1",function (req, res) {
		var isParameter=helper.isParameter(req.body, ['from',"to"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
			}else{
			var funcData =	IcoPhase.methods.setPhasePublicSale1(req.body.from,req.body.to).encodeABI();
			var statusCode = (res.statusCode==200)? true : false;
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			sendSignedTransaction(config.smartcontract.icoPhase.owner.address, config.smartcontract.icoPhase.address, config.smartcontract.icoPhase.owner.privateKey, funcData).then(result=>{
				res.send(helper.response(statusCode,message,result));
			});
		}
	});
	app.post("/api/setPhasePublicSale2",function (req, res) {
		var isParameter=helper.isParameter(req.body, ['from',"to"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
			}else{
			var funcData =	IcoPhase.methods.setPhasePublicSale2(req.body.from,req.body.to).encodeABI();
			var statusCode = (res.statusCode==200)? true : false;
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			sendSignedTransaction(config.smartcontract.icoPhase.owner.address, config.smartcontract.icoPhase.address, config.smartcontract.icoPhase.owner.privateKey, funcData).then(result=>{
				res.send(helper.response(statusCode,message,result));
			});
		}
	});
	app.post("/api/setPhasePublicSale3",function (req, res) {
		var isParameter=helper.isParameter(req.body, ['from',"to"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
			}else{
			var funcData =	IcoPhase.methods.setPhasePublicSale3(req.body.from,req.body.to).encodeABI();
			var statusCode = (res.statusCode==200)? true : false;
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			sendSignedTransaction(config.smartcontract.icoPhase.owner.address, config.smartcontract.icoPhase.address, config.smartcontract.icoPhase.owner.privateKey, funcData).then(result=>{
				res.send(helper.response(statusCode,message,result));
			});
		}
	});

	app.get("/api/getCurrentICOPhase",function (req, res) {
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		IcoPhase.methods.getCurrentICOPhase().call().then(result=>{
			res.send(helper.response(statusCode,message,result));
		});
	});

	app.get("/api/aaaa",function (req, res) {
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		IcoBonus.methods.getBonusByETH(200).call().then(result=>{
			console.log(result);
			//res.send(helper.response(statusCode,message,result));
		});
	});


	// helper for Web3
	app.get("/api/getCurrenGas",function(req,res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		web3.eth.getGasPrice().then(result=>{
			console.log(web3.utils.fromWei(result, 'Gwei'));
		});
		res.send(helper.response(statusCode,message,web3.eth.getGasPrice()));
	});

	app.get("/api/convert",function(req,res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var unitFrom = req.query.unitFrom,
		unitTo = req.query.unitTo,
		value = req.query.value;
		var isParameter=helper.isParameter(req.query, ['unitFrom',"unitTo","value"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}else{
			if(unitFrom=="gwei" && unitTo=="eth"){
				res.send(helper.response(statusCode,message,web3.utils.fromWei(value, 'ether')));
			}
			if(unitFrom=="gwei" && unitTo=="wei"){
				res.send(helper.response(statusCode,message,web3.utils.fromWei(value, 'wei')));
			}
			if(unitFrom=="eth" && unitTo=="wei"){
				res.send(helper.response(statusCode,message,web3.utils.toWei(value, 'wei')));
			}
			if(unitFrom=="eth" && unitTo=="gwei"){
				res.send(helper.response(statusCode,message,web3.utils.toWei(value, 'gwei')));
			}
		}
	});

	//custome function
	function sendSignedTransaction(from, to, privateKeyy, data=null, value=null, gasPrice=null, gasLimit=null){
		try{
			return new Promise(async (resolve, reject) => {
				var rawTx = {
					from: from,
					to: to,
				};
				var gasprice = (gasPrice==null? 20 : 20);
				if(data)
				rawTx.data=data;
				if(value)
				rawTx.value=value;
				web3.eth.getGasPrice().then(result=>{
					gasprice=web3.utils.fromWei(result, 'Gwei');
				});
				if(!gasLimit){
					gasLimit = await web3.eth.estimateGas(rawTx);
				}

				var nonce = await web3.eth.getTransactionCount(from, "pending");
				rawTx.nonce=web3.utils.toHex(nonce);
				rawTx.gasPrice=web3.utils.toHex(gasprice);
				rawTx.gasLimit=web3.utils.toHex(gasLimit);

				var privateKey = new Buffer(privateKeyy, 'hex');

				var tx = new Tx(rawTx);
				tx.sign(privateKey);

				var serializedTx = tx.serialize();
				web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
				.on('receipt', result=>resolve(result));
			});
			}catch(err){
			console.log(error);
		}
	}*/
}
