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
	smartContract : "SELECT * FROM `smartcontract` WHERE `SmartContractID`=?",
	fundraising : "SELECT * FROM `fundraising` WHERE `FundRaisingID`=?",
	addTransaction : "INSERT INTO `transactioncgn`(`UserID`, `Value`, `ValueETH`, `HashKey`, `Type`, `Status`, `DateCreated`) VALUES (?,?,?,?,0,0,?)"
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
			setTimeout(function(){
			 sendSignedTransaction(results[0].OwnerAddress,results[0].Address, descryptionPrivateKey(results[0].PrivateKey), setEnd);
			},10000);
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
	
	app.get('/api/isAddress', function(req, res){
		var statusCode = (res.statusCode==200)? true : false;
		var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
		try{
			var account = web3.eth.getStorageAt(req.query.address, 0).then(result=>{
				console.log(result);
				if(result!=null){
					res.send(helper.response(statusCode,message,true));
				}
			});
		}catch(err){
			res.send(helper.response(statusCode,message,false));
		}
	});
	
	app.post("/api/buyCGN",function(req,res){
		var isParameter=helper.isParameter(req.body, ['address','privateKey','IDUser','valueCGN','valueETH']);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		connection.query(querySQL.fundraising,[1],function (error, results) {
			web3.eth.getBalance(req.body.address).then(function(eth){
				new Promise(async (resolve, reject) => {
					//var gasprice = await web3.eth.getGasPrice();
					//gasUsed = await gasForATransaction(req.body.address,results[0].Address,eth);
					//var amountMustPay = web3.utils.fromWei(gasUsed*gasprice+"","ether");
					//var amountToSend =  parseFloat(req.body.value) + parseFloat(amountMustPay);
					if((gasCustomeETH()+parseFloat(req.body.valueETH))>parseFloat(web3.utils.fromWei(eth))){
						var temporary = {
							"YourBalance" : web3.utils.fromWei(eth),
							"Fees":gasCustomeETH(),
							"Amount":req.body.valueETH,
							"TotalPayable" : gasCustomeETH()+parseFloat(req.body.valueETH)
							};
						res.send(helper.response(false,"Fees and balance for transactions are not sufficient for the transaction",temporary));
					}else{
						//console.log(descryptionPrivateKey(req.body.privateKey));
						//0x1525d2a5e79f16373e93ea1b86ddc11806051c7be8f10cfc348dcb817808a51d
						//res.send(helper.response(404,"aaa",descryptionPrivateKey(req.body.privateKey)));
						//var privateKey = await descryptionPrivateKey(req.body.privateKey);
						//sendSignedTransaction(req.body.address,results[0].Address, privateKey , null,web3.utils.toWei(amountToSend+"")).then(result=>{
						//	var statusCode = (res.statusCode==200)? true : false;
						//	var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
						//	res.send(helper.response(statusCode,message,result));
						//});
						
						var value = web3.utils.toWei(req.body.valueETH+""),
							data =null,
							gasprice = 60,
							gasLimit = 200000;
						
						var statusCode = (res.statusCode==200)? true : false;
						var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
						try{
							new Promise(async (resolve, reject) => {
								var rawTx = {
									from: req.body.address,
									to: results[0].Address,
								};
								
								
								if(data)
								rawTx.data=data;
								if(value)
								rawTx.value=value;
							
								//gasprice = await web3.eth.getGasPrice();
								/*
								if(!gasLimit){
									gasLimit = await web3.eth.estimateGas(rawTx);
								}*/
								

								var nonce = await web3.eth.getTransactionCount(req.body.address, "pending");
								rawTx.nonce=web3.utils.toHex(nonce);
								rawTx.gasPrice=web3.utils.toHex(gasprice);
								rawTx.gasLimit=web3.utils.toHex(gasLimit);

								var privateKey = new Buffer(descryptionPrivateKey(req.body.privateKey), 'hex');

								var tx = new Tx(rawTx);
								tx.sign(privateKey);
								//console.log(tx.hash(true).toString('hex'));
								var resultReturn = {
										hash:tx.hash(true).toString('hex'),
										status:0,
										result:"Pending"
									};
								//(`UserID`, `Value`, `ValueETH`, `HashKey`, `Type`, `Status`, `DateCreated`)
								//?,			?,		?,			?,			0,		0,			?
								await connection.query(querySQL.addTransaction,[req.body.IDUser,req.body.valueCGN,req.body.valueETH,tx.hash(true).toString('hex'),dateTimeNow()],function (error, results) {
									res.send(helper.response(statusCode,message,resultReturn));
								});
								var serializedTx = tx.serialize();
								web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', result=>resolve(result));
							});
						}catch(err){
							//console.log(error);
						}
					}
				});
			});
		});
	});
	
	app.post("/api/getGasPrice",function(req,res){
		var isParameter=helper.isParameter(req.body, ['addresFrom','addresTo',"value"]);
		if(isParameter.length>0){
			statusCode = 404;
			res.send("Missing Parameter: "+isParameter.toString());
		}
		new Promise(async (resolve, reject) => {
			var gasprice = await web3.eth.getGasPrice(),
			gasUsed = await gasForATransaction(req.body.addresFrom,req.body.addresTo,req.body.value);
			var amountMustPay = web3.utils.fromWei(gasUsed*gasprice+"","ether");
			
			var statusCode = (res.statusCode==200)? true : false;
			var message = (res.statusCode==200)? "Successful!" : "Error, please try again!";
			res.send(helper.response(statusCode,message,{"fee":amountMustPay,"unit":"ETH"}));
		});
	});
	
	app.get('/api/mahoa', function(req, res){
		res.send(helper.response(true,"",encryptionPrivateKey(req.query.key)));
	});
	
	app.get('/api/giaima', function(req, res){
		res.send(helper.response(true,"",descryptionPrivateKey(req.query.key)));
	});
	
	function gasCustomeETH(){
		var eth = parseFloat(web3.utils.fromWei(200000+""))*parseFloat(web3.utils.toWei(60+""));
		return web3.utils.fromWei(eth+"");
	}
	
	function dateTimeNow(){
		var currentdate = new Date();
		var datetime = currentdate.getUTCFullYear() 
						+ "-" + (currentdate.getUTCMonth()+1) 
						+ "-" + currentdate.getUTCDate() 
						+ "-" + currentdate.getUTCHours() 
						+ "-" + currentdate.getUTCMinutes() 
						+ "-" + currentdate.getUTCSeconds();
		return datetime;
	}
	
	function gasForATransaction(addressFrom,AddressTo,amount){
		return web3.eth.estimateGas({
			from: addressFrom,
			to: AddressTo,
			amount: amount
		});
	}
	
	function descryptionPrivateKey(key){
		var key = helper.descrypt(config.keyRandom.key,key).split('0x');
		if(key.length==2){
			return key[1];
		}else if(key.length==1){
			return key[0];
		}
	}
	
	function encryptionPrivateKey(key){
		return helper.encrypt(config.keyRandom.key,key);
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
			
				gasprice = await web3.eth.getGasPrice();
				
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
				web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', result=>resolve(result));
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
