Promise = require('bluebird');
var path = require('path');
var soap = require('soap');
var helper = require('./../common/helper');
var logger = require('./../common/logging/winston')(path.join(process.cwd(),'/controllers/soapApp.js')); //(path.join(__dirname,'soapApp.js')); //require('./../common/logging/winston')(__filename);
var parser = require('fast-xml-parser');
//var he = require('he');
//var uuidV1 = require('uuid/v1');
const moment = require('moment');
//var processAction = Promise.promisify(require('./processAction'));
//const dao = require('./../services/dbClient');
//var resCode = require('./../model/resCode');
const myCache = require('./../common/nodeCache');

//  *** line that requires services/web-server.js is here ***
const {pool,closeConn} = require('./../services/database.js');

//Load Webservice definetion
var xml = require('fs').readFileSync(path.join(process.cwd(),'/controllers/sdk_endpoint.wsdl'), 'utf8');
var service = {
    SDMSDK: {
        BasicHttpBinding_ISDMSDK: {
        GetCustomerByID: function (args,cb,headers, req) {  //soap header
          //console.log(req.connection);//.Socket.parser.HTTPParser.parsingHeadersStart);  
          //var reqTimeMs = new Date().getTime(); //YYYYMMDDHHMISS  
          if(args["customerID"]){
            let customer_id = args["customerID"];  
            logger.info('[GetCustomerByID] customer_id => '+customer_id);
            pool.getConnection()
            .then(con => {
                logger.info('got connection from pool');
                let sql_getCustomerByID = 'SELECT {0}.*,W.WCUST_ID,W.WCUST_USERNAME,W.WCUST_PASSWORD,W.WCUST_HASHEDPASSWORD,W.WCUST_CORPID,W.WCUST_STATUS,W.CRT_BY AS WCUST_WEB_CRT_BY,W.CRT_DATE AS WCUST_WEB_CRT_DATE,W.UPT_BY AS WCUST_WEB_UPT_BY,W.UPT_DATE AS WCUST_WEB_UPT_DATE,W.WCUST_TOKEN,W.WCUST_TOKEN_DATE,W.WCUST_ACTIVE_DATE,W.WCUST_FIRSTNAME,W.WCUST_MIDNAME,W.WCUST_LASTNAME,W.WCUST_OFFER1,W.WCUST_OFFER2,W.WCUST_SEC_QUESTION,W.WCUST_SEC_ANSWER,W.WCUST_IS_GUEST  FROM CC_CUSTOMER INNER JOIN CC_WEB_CUSTOMER W ON CUST_ID = W.WCUST_ID WHERE CUST_ID='+customer_id; //ORDER BY CUST_DATEADDED DESC, CUST_ID DESC';
                let options = {
                    outFormat: oracledb.OUT_FORMAT_OBJECT   // query result format
                    // extendedMetaData: true,   // get extra metadata
                    // fetchArraySize: 100       // internal buffer allocation size for tuning
                  };
                logger.info('execute query =>'); 
                logger.info(sql_getCustomerByID);

                con.execute(sql_getCustomerByID,{},options)
                .then(result =>{
                    logger.info('result to return =>');
                    console.log(result.rows);
                })
                .catch(exec_error => {
                    logger.info('execute error to return =>');
                    console.log(exec_error);
                })
            })
            .catch(err => {
                logger.info('error get connection from pool to return =>');
                console.log(err);
            })
          }else{
            logger.info('[GetCustomerByID] invalid customer_id ');
          }  

          //args  

          var responseXML = 'SDK_OK' //mapRequestToResponse(args) //initial xml
          cb(responseXML);
          
        }
      }
    }
  };

 //Start express-server with soap service 
const soapApp = (app) => {
    var port = normalizePort(process.env.PORT || '2020');

    var options = {
      ignoreNameSpace : true,
    };

    app.listen(port, function(){
        //Note: /wsdl route will be handled by soap module
        //and all other routes & middleware will continue to work
        var soapServer = soap.listen(app, '/', service, xml, function(){
            logger.info('[Server] started '+new Date());
        });
     
        // soapServer.on('headers', function(headers, methodName) {
        //   // It is possible to change the value of the headers
        //   // before they are handed to the service method.
        //   // It is also possible to throw a SOAP Fault
        // });

        //logging
        soapServer.log = function(type, data) {
            // type is 'received' or 'replied'
            if(type === 'received')
            {
                //logger.info(data);
                if( parser.validate(data) === true) { //optional (it'll return an object in case it's not valid)
                    var jsonObj = parser.parse(data,options);
                    //save raw xml to db
                    //dao.saveRawRequest(data,JSON.stringify(jsonObj)); 
                }
            }else if(type === 'replied')
            {
                // logger.info('replied =>');
                // logger.info(data);
            }else{
                //type is info
                //logger.info('Info: '+data);
            } 
        };
        

        //Map soap request    
        soapServer.on('request', function(request, methodName){
            // logger.info('[AtgMessageRequestType] '+ methodName);
            //logger.info('requestXML => '+ JSON.stringify(request));
           
            
          });
        //Map response  
        soapServer.on('response', function(response, methodName){
          //console.log(httpContext.get('reqId'));
            // logger.info('responseXML => '+ JSON.stringify(response));
                //assert.equal(response.result, responseXML);
                //assert.equal(methodName, 'sayHello');
                //response.result = response.result.replace('Bob','John');
              });
    });
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
      // named pipe
      return val;
    }
    if (port >= 0) {
      // port number
      return port;
    }
    return false;
  }

function assignResCode(massageType,responseXML,resp,error) {
  if(!helper.isNullEmptry(resp)){
    if(massageType === '01'){
      responseXML["RequestService01Result"]["ResHdr"]["ResCd"]  = resp["ResHdr"]["ResCd"];
      responseXML["RequestService01Result"]["ResHdr"]["ResMsg"] = resp["ResHdr"]["ResMsg"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrCd"] = resp["ResDtl"]["ErrCd"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgEng"]  = resp["ResDtl"]["ErrMsgEng"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgThai"] = resp["ResDtl"]["ErrMsgThai"];
      responseXML["RequestService01Result"]["ResDtl"]["Ref1"] = resp["ResDtl"]["Ref1"].length > 0?resp["ResDtl"]["Ref1"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref3"] = resp["ResDtl"]["Ref3"].length > 0?resp["ResDtl"]["Ref3"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref4"] = resp["ResDtl"]["Ref4"].length > 0?resp["ResDtl"]["Ref4"]:'';
      //responseXML["RequestService01Result"]["ResDtl"]["Ref5"] = resp["ResDtl"]["Ref5"].length > 0?resp["ResDtl"]["Ref5"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref6"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref6"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref8"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref8"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref9"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref9"]:'';
      responseXML["RequestService01Result"]["ResDtl"]["Ref10"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref10"]:'';
    }else if(massageType === '02'){
      responseXML["RequestService02Result"]["ResHdr"]["ResCd"]  = resp["ResHdr"]["ResCd"];
      responseXML["RequestService02Result"]["ResHdr"]["ResMsg"] = resp["ResHdr"]["ResMsg"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrCd"] = resp["ResDtl"]["ErrCd"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgEng"]  = resp["ResDtl"]["ErrMsgEng"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgThai"] = resp["ResDtl"]["ErrMsgThai"];
      responseXML["RequestService02Result"]["ResDtl"]["Ref1"] = resp["ResDtl"]["Ref1"].length > 0?resp["ResDtl"]["Ref1"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref3"] = resp["ResDtl"]["Ref3"].length > 0?resp["ResDtl"]["Ref3"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref4"] = resp["ResDtl"]["Ref4"].length > 0?resp["ResDtl"]["Ref4"]:'';
      //responseXML["RequestService02Result"]["ResDtl"]["Ref5"] = resp["ResDtl"]["Ref5"].length > 0?resp["ResDtl"]["Ref5"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref6"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref6"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref8"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref8"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref9"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref9"]:'';
      responseXML["RequestService02Result"]["ResDtl"]["Ref10"] = resp["ResDtl"]["Ref6"].length > 0?resp["ResDtl"]["Ref10"]:'';
    }
  }else if(!helper.isNullEmptry(error)){
    if(massageType === '01'){
      responseXML["RequestService01Result"]["ResHdr"]["ResCd"]  = '8007';
      responseXML["RequestService01Result"]["ResHdr"]["ResMsg"] = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrCd"] = '8007';
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgEng"]  = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService01Result"]["ResDtl"]["ErrMsgThai"] = resCode["code"]["8007"]["msgEng"];
    }else if(massageType === '02'){
      responseXML["RequestService02Result"]["ResHdr"]["ResCd"]  = '8007';
      responseXML["RequestService02Result"]["ResHdr"]["ResMsg"] = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrCd"] = '8007';
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgEng"]  = resCode["code"]["8007"]["msgEng"];
      responseXML["RequestService02Result"]["ResDtl"]["ErrMsgThai"] = resCode["code"]["8007"]["msgEng"];
    }
  }
  
  return responseXML;
} 

function mapRequestToResponse(args){
    var responseJson = {};
    logger.info(args);

    if(args["RegMsg01"]){
      responseJson["RequestService01Result"] = {}
      responseJson["RequestService01Result"]["ResHdr"] = {}
      responseJson["RequestService01Result"]["ResDtl"] = {}

      responseJson["RequestService01Result"]["ResHdr"]["ActCd"]  =  args["RegMsg01"]["ReqHdr"]["ActCd"];
      responseJson["RequestService01Result"]["ResHdr"]["ResID"]  =  args["RegMsg01"]["ReqHdr"]["ReqID"];
      responseJson["RequestService01Result"]["ResHdr"]["ResDt"]  =  moment().format('YYYYMMDDHHmmss');
      responseJson["RequestService01Result"]["ResHdr"]["ResCd"]  = '';
      responseJson["RequestService01Result"]["ResHdr"]["ResMsg"] = '';
      
      responseJson["RequestService01Result"]["ResDtl"]["ErrCd"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["ErrMsgEng"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["ErrMsgThai"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["ApvlCd"] = args["RegMsg01"]["ReqHdr"]["ActCd"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref1"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref2"] = args["RegMsg01"]["TrnHdr"]["StrCd"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref3"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref4"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref5"] = args["RegMsg01"]["TrnHdr"]["TtlAmt"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref6"] = args["RegMsg01"]["TrnHdr"]["TrnDt"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref7"] = args["RegMsg01"]["TrnHdr"]["ChkNo"];
      responseJson["RequestService01Result"]["ResDtl"]["Ref8"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref9"] = '';
      responseJson["RequestService01Result"]["ResDtl"]["Ref10"] = '';

      responseJson["RequestService01Result"]["MinorID"] = 0; //uuidV1();
      
    }else if(args["RegMsg02"]){
      responseJson["RequestService02Result"] = {}
      responseJson["RequestService02Result"]["ResHdr"] = {}
      responseJson["RequestService02Result"]["ResDtl"] = {}

      responseJson["RequestService02Result"]["ResHdr"]["ActCd"]  =  args["RegMsg02"]["ReqHdr"]["ActCd"];
      responseJson["RequestService02Result"]["ResHdr"]["ResID"]  =  args["RegMsg02"]["ReqHdr"]["ReqID"];
      responseJson["RequestService02Result"]["ResHdr"]["ResDt"]  =  moment().format('YYYYMMDDHHmmss');
      responseJson["RequestService02Result"]["ResHdr"]["ResCd"]  = '';
      responseJson["RequestService02Result"]["ResHdr"]["ResMsg"] = '';
      
      responseJson["RequestService02Result"]["ResDtl"]["ErrCd"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["ErrMsgEng"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["ErrMsgThai"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["ApvlCd"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref1"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref2"] = args["RegMsg02"]["TrnHdr"]["StrCd"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref3"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref4"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref5"] = args["RegMsg02"]["TrnHdr"]["TtlAmt"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref6"] = args["RegMsg02"]["TrnHdr"]["TrnDt"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref7"] = args["RegMsg02"]["TrnHdr"]["ChkNo"];
      responseJson["RequestService02Result"]["ResDtl"]["Ref8"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref9"] = '';
      responseJson["RequestService02Result"]["ResDtl"]["Ref10"] = '';

      responseJson["RequestService02Result"]["MinorID"] = 0; //uuidV1();
    }
    return responseJson;
}

function saveRequestMessage(request,reqTimeMs,tran_request_id){
  if(request["RegMsg01"]["ReqHdr"]["ReqID"]){ 
    //let reqId = request["RegMsg01"]["ReqHdr"]["ReqID"]
    dao.saveReqId(reqTimeMs,tran_request_id,'','message01',JSON.stringify(request))
  }else if(request["RegMsg02"]["ReqHdr"]["ReqID"]){
    //let reqId = request["RegMsg02"]["ReqHdr"]["ReqID"]
    dao.saveReqId(reqTimeMs,tran_request_id,'','message02',JSON.stringify(request))
  }
} 

module.exports = soapApp;