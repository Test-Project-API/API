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
	
	app.get('/api/getPhaseList', function (req, res) {
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var preSaleStartDate = 0,
				preSaleEndDate = 0,
				publicSaleStartDate = 0,
				publicSaleEndDate = 0;
				
			phaseBonus.methods.getPhaseSale(1,0).call().then(result=>{
				preSaleStartDate=result;
			}).then(()=>{
				phaseBonus.methods.getPhaseSale(1,1).call().then(result=>{
					preSaleEndDate = result;
				}).then(()=>{
					phaseBonus.methods.getPhaseSale(2,0).call().then(result=>{
						publicSaleStartDate = result;
					}).then(()=>{
						phaseBonus.methods.getPhaseSale(2,1).call().then(result=>{
							publicSaleEndDate = result;
							var jsonPreSale = {"PhaseName" :"Pre-Sale","StartDate" : preSaleStartDate,"EndDate" : preSaleEndDate},
							jsonPublicSale = {"PhaseName" :"Public Sale","StartDate" : publicSaleStartDate,"EndDate" : publicSaleEndDate};
							
							var statusCode = (res.statusCode==200)? true : false;
							var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
							var value = (res.statusCode==200)? [jsonPreSale,jsonPublicSale] : null ;
							res.send(helper.response(statusCode,message,value));
						});	
					});
				});
			});
		});
	});
	
	app.get('/api/getBonusList', function(req, res){
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			phaseBonus.methods.getBonusSale(1,0).call().then(preSaleBonus1=>{
				phaseBonus.methods.getBonusSale(1,1).call().then(preSaleBonus2=>{
					phaseBonus.methods.getBonusSale(2,0).call().then(publicSaleBonus=>{
						var statusCode = (res.statusCode==200)? true : false;
						var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
						var jsonPreSale1 = {"PhaseName" :"Pre-Sale","Bonus" : preSaleBonus1,"Type":"Company"},
						jsonPreSale2 = {"PhaseName" :"Pre-Sale","Bonus" : preSaleBonus2,"Type":"Investors"}
						jsonPublicSale = {"PhaseName" :"Public Sale","Bonus" :publicSaleBonus,"Type":"Investors"};
						
						var value = (res.statusCode==200)? [jsonPreSale1,jsonPreSale2,jsonPublicSale] : null;
						res.send(helper.response(statusCode,message,value));
					});
				});
			});
		});
	});
	app.get('/api/getBonusAffilate', function(req, res){
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var preSale = 0,
			publicSale =0;
			phaseBonus.methods.getBonusAffiliate(1).call().then(result=>{
				preSale = result;
			}).then(()=>{
				phaseBonus.methods.getBonusAffiliate(2).call().then(result=>{
					var statusCode = (res.statusCode==200)? true : false;
					var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
					publicSale = result;
					var jsonPreSale = {"PhaseName" :"Pre-Sale","Bonus" : preSale},
					jsonPublicSale = {"PhaseName" :"Public Sale","Bonus" : publicSale};
							
					var value = (res.statusCode==200)? [jsonPreSale,jsonPublicSale] : null;
					res.send(helper.response(statusCode,message,value));
				});
			});
		});
	});
	app.post('/api/setPhase', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','startDate','endDate']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			
			var setStart = phaseBonus.methods.setPhaseSale(req.body.phase,0,req.body.startDate).encodeABI(),
			setEnd = phaseBonus.methods.setPhaseSale(req.body.phase,1,req.body.endDate).encodeABI();
			sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), setStart);
			sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), setEnd);
			res.send(helper.response(statusCode,message,true));
		});
	});
	app.post('/api/setBonus', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','index','bonus']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var bonusFunc = phaseBonus.methods.setBonusSale(req.body.phase,req.body.index,req.body.bonus).encodeABI();
			sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), bonusFunc);
			res.send(helper.response(statusCode,message,true));
		});
	});
	
	app.post('/api/setBonusAffiliate', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','bonus']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[1],function (error, results) {
			var phaseBonus = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var bonusFunc = phaseBonus.methods.setBonusAffiliate(req.body.phase,req.body.bonus).encodeABI();
			sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), bonusFunc);
			res.send(helper.response(statusCode,message,true));
		});
	});
	
	app.post('/api/tokenSupply', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[2],function (error, results) {
			//console.log(results);
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			//console.log(cgnContract);
			cgnContract.methods.getPhaseSupply(req.body.phase).call().then(result1=>{
				if(req.body.phase==1){
					cgnContract.methods.getPhaseSold(req.body.phase).call().then(result2=>{
						var supplyPhase = {"PhaseName":"Pre-Sale","Supply":web3.utils.fromWei(result1,"ether"),"CurrentSupply":result2};
						res.send(helper.response(statusCode,message,supplyPhase));
					});
				}else if(req.body.phase==2){
					cgnContract.methods.getPhaseSold(req.body.phase).call().then(result2=>{
						var supplyPhase = {"PhaseName":"Public Sale","Supply":web3.utils.fromWei(result1,"ether"),"CurrentSupply":result2};
						res.send(helper.response(statusCode,message,supplyPhase));
					});
				}
			});
		});
	});
	
	app.get('/api/tokenRate', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			cgnContract.methods.getTokenRate(1).call().then(presale=>{
				cgnContract.methods.getTokenRate(2).call().then(publicsale=>{
					var presalePrice = {"PhaseName":"Pre-Sale","Price":presale,"Unit":"1eth"},
					publicSalePrice = {"PhaseName":"Public Sale","Price":publicsale,"Unit":"1eth"}
					res.send(helper.response(statusCode,message,[presalePrice,publicSalePrice]));
				})
			});
		});
	});
	
	app.get('/api/walletFund', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			cgnContract.methods.getEthFundDeposit().call().then(wallet=>{
				res.send(helper.response(statusCode,message,wallet));
			});
		});
	});
	
	app.post('/api/setTokenRate', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','rate']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var cgnContractFunc = cgnContract.methods.setTokenRate(req.body.phase,req.body.rate).encodeABI();
			sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), cgnContractFunc);
			res.send(helper.response(statusCode,message,true));
			
		});
	});
	
	app.get('/api/purchaseLimit', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			cgnContract.methods.getMinBuy(1,0).call().then(minBuyPreCompany=>{
				cgnContract.methods.getMinBuy(1,1).call().then(minBuyPreInvestors=>{
					cgnContract.methods.getMinBuy(2,0).call().then(minBuyPub=>{
						cgnContract.methods.getMaxBuy(1).call().then(maxBuy1=>{
							cgnContract.methods.getMaxBuy(2).call().then(maxBuy2=>{
						var preSale1 = {"PhaseName":"Pre-Sale", "minBuy":web3.utils.fromWei(minBuyPreCompany,"ether"),"maxBuy":web3.utils.fromWei(maxBuy1),"Unit":"ETH","type":"Company"},
						preSale2 = {"PhaseName":"Pre-Sale", "minBuy":web3.utils.fromWei(minBuyPreInvestors),"maxBuy":web3.utils.fromWei(minBuyPreCompany),"Unit":"ETH","type":"Investors"};
						publicSale = {"PhaseName":"Public Sale", "minBuy":web3.utils.fromWei(minBuyPub),"maxBuy":web3.utils.fromWei(maxBuy2),"Unit":"ETH","type":"Investors"};
						res.send(helper.response(statusCode,message,[preSale1,preSale2,publicSale]));
							});
						});
					});
				});
			});
		});
	});
	
	app.post('/api/purchaseMin', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','index','value']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var cgnContractFunc = cgnContract.methods.setMinBuy(req.body.phase,req.body.index,web3.utils.toWei(req.body.value, 'ether')).encodeABI();
			var transaction =  sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), cgnContractFunc);
			res.send(helper.response(statusCode,message,transaction));
		});
	});
	
	app.post('/api/purchaseMax', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','value']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var cgnContract = new web3.eth.Contract(JSON.parse(results[0].JSON),results[0].Address);
			var cgnContractFunc = cgnContract.methods.setMaxBuy(req.body.phase,web3.utils.toWei(req.body.value, 'ether')).encodeABI();
			var transaction = sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), cgnContractFunc);
			res.send(helper.response(statusCode,message,transaction));
		});
	});
	
	app.post('/api/testbuy', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";

		var isParameter=helper.isParameter(req.body, ['phase','value']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.smartContract,[2],function (error, results) {
			var transaction = sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), null,1);
			res.send(helper.response(statusCode,message,transaction));
		});
	});
	
	function descryptionPrivateKey(key){
		return helper.descrypt(config.keyRandom.key,key);
	}
	
	/* from : owner address
	*	to : contact Address
	*	privateKeyy
	*	function smartContract
	*/
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
			
				
				
				if(!gasLimit){
					gasLimit = await web3.eth.estimateGas(rawTx);
				}
				web3.eth.getGasPrice().then(result=>{
					var nonce = await web3.eth.getTransactionCount(from, "pending");
					rawTx.nonce=web3.utils.toHex(nonce);
					gasprice=web3.utils.toWei(result);
					rawTx.gasPrice=web3.utils.toHex(gasprice);
					rawTx.gasLimit=web3.utils.toHex(gasLimit);
					var privateKey = new Buffer(privateKeyy, 'hex');
					var tx = new Tx(rawTx);
					tx.sign(privateKey);
					var serializedTx = tx.serialize();
					web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', result=>resolve(result));
				});
			});
		}catch(err){
			//console.log(error);
		}
	}
	
	
	/*
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
	}*/
}
