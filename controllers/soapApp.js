Promise = require('bluebird');
var path = require('path');
var soap = require('soap');
var helper = require('./../common/helper');
var logger = require('./../common/logging/winston')(path.join(process.cwd(),'/controllers/soapApp.js')); //(path.join(__dirname,'soapApp.js')); //require('./../common/logging/winston')(__filename);
var parser = require('fast-xml-parser');

const moment = require('moment');
const myCache = require('./../common/nodeCache');

//  *** line that requires services/web-server.js is here ***
const oracledb = require('oracledb');
const {initialize,closeConn} = require('./../services/database.js');

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

            let responseXML = {}; //initial xml
            try{
              oracledb.getConnection()
              .then(con => {
                  //logger.info('got connection from pool');
                  let sql_getCustomerByID = 'SELECT CC_CUSTOMER.*,W.WCUST_ID,W.WCUST_USERNAME,W.WCUST_PASSWORD,W.WCUST_HASHEDPASSWORD,W.WCUST_CORPID,W.WCUST_STATUS,W.CRT_BY AS WCUST_WEB_CRT_BY,W.CRT_DATE AS WCUST_WEB_CRT_DATE,W.UPT_BY AS WCUST_WEB_UPT_BY,W.UPT_DATE AS WCUST_WEB_UPT_DATE,W.WCUST_TOKEN,W.WCUST_TOKEN_DATE,W.WCUST_ACTIVE_DATE,W.WCUST_FIRSTNAME,W.WCUST_MIDNAME,W.WCUST_LASTNAME,W.WCUST_OFFER1,W.WCUST_OFFER2,W.WCUST_SEC_QUESTION,W.WCUST_SEC_ANSWER,W.WCUST_IS_GUEST  FROM CC_CUSTOMER INNER JOIN CC_WEB_CUSTOMER W ON CUST_ID = W.WCUST_ID WHERE CUST_ID='+customer_id; //ORDER BY CUST_DATEADDED DESC, CUST_ID DESC';
                  let options = {
                      outFormat: oracledb.OUT_FORMAT_OBJECT   // query result format
                      // extendedMetaData: true,   // get extra metadata
                      // fetchArraySize: 100       // internal buffer allocation size for tuning
                    };
                  //logger.info('execute query =>'); 
                  //logger.info(sql_getCustomerByID);
  
                  con.execute(sql_getCustomerByID,{},options)
                  .then(result =>{
                      //logger.info('result to return =>');
                      //console.log(result.rows);
                      responseXML = mapRequestToResponse(result.rows,null);
                      cb(responseXML);
                  })
                  .catch(exec_error => {
                      logger.info('execute error to return =>');
                      console.log(exec_error);
                      responseXML = mapRequestToResponse([],exec_error);
                      cb(responseXML);
                  })
                  .finally(()=>{
                    if(con){
                      try{
                        con.close();
                      }catch(con_err){
                        console.log(con_err);
                      }
                    }
                  });
              })
              .catch(err => {
                  logger.info('error get connection from pool to return =>');
                  console.log(err);
                  responseXML = mapRequestToResponse([],err);
                  cb(responseXML);
              })
            }catch(ex){
              logger.info('error pool.getConnection from pool to return =>');
              console.log(ex);
              responseXML = mapRequestToResponse([],ex);
              cb(responseXML);
            }

          }else{
            logger.info('[GetCustomerByID] invalid customer_id ');
            responseXML = mapRequestToResponse([],null);
          }   
          //logger.info(responseXML);
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

function mapRequestToResponse(rows,err){
    var responseJson = {};
    responseJson["GetCustomerByIDResult"] = {}
    responseJson["SDKResult"] = {}
    
    if(rows.length > 0){
      //logger.info(rows);
      let row = rows[0];
      responseJson["GetCustomerByIDResult"]["CRT_BYUSER"] = !helper.isNullEmptry(row["CRT_BYUSER"])?row["CRT_BYUSER"]:'';
      responseJson["GetCustomerByIDResult"]["CRT_DATE"] = renderDate(row["CRT_DATE"]); //moment().format('YYYYMMDDHHmmss');
      responseJson["GetCustomerByIDResult"]["CUST_CARDNUMBER"] = !helper.isNullEmptry(row["CUST_CARDNUMBER"])?row["CUST_CARDNUMBER"]:'';
      responseJson["GetCustomerByIDResult"]["CUST_CLASSID"] = !helper.isNullEmptry(row["CUST_CLASSID"])?row["CUST_CLASSID"]:'';
      responseJson["GetCustomerByIDResult"]["CUST_COMPANY"] = !helper.isNullEmptry(row["CUST_COMPANY"])?row["CUST_COMPANY"]:'';
      responseJson["GetCustomerByIDResult"]["CUST_COMPANYUN"] = !helper.isNullEmptry(row["CUST_COMPANYUN"])?row["CUST_COMPANYUN"]:'';
      responseJson["GetCustomerByIDResult"]["CUST_CORPID"] = !helper.isNullEmptry(row["CUST_CORPID"])?row["CUST_CORPID"]:'';
      responseJson["GetCustomerByIDResult"]["CUST_DATEADDED"] = renderDate(row["CUST_DATEADDED"]); //moment().format('YYYYMMDDHHmmss');  /2019-11-25T07:42:19.000Z
      responseJson["GetCustomerByIDResult"]["CUST_DATEOFBIRHT"] = renderDate(row["CUST_DATEOFBIRHT"]);// row["CUST_DATEOFBIRHT"]; 
      responseJson["GetCustomerByIDResult"]["CUST_DEPENDENTS"] = !helper.isNullEmptry(row["CUST_DEPENDENTS"])?row["CUST_DEPENDENTS"]:''; 
      responseJson["GetCustomerByIDResult"]["CUST_EMAIL"] = !helper.isNullEmptry(row["CUST_EMAIL"])?row["CUST_EMAIL"]:''; 
      responseJson["GetCustomerByIDResult"]["CUST_FIRSTNAME"] =!helper.isNullEmptry(row["CUST_FIRSTNAME"])?row["CUST_FIRSTNAME"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_FIRSTNAMEUN"] =!helper.isNullEmptry(row["CUST_FIRSTNAMEUN"])?row["CUST_FIRSTNAMEUN"]:'';  

      responseJson["GetCustomerByIDResult"]["CUST_GENDER"] =!helper.isNullEmptry(row["CUST_GENDER"])?getGender(row["CUST_GENDER"]):'';  
      responseJson["GetCustomerByIDResult"]["CUST_ID"] =!helper.isNullEmptry(row["CUST_ID"])?row["CUST_ID"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_LASTNAME"] =!helper.isNullEmptry(row["CUST_LASTNAME"])?row["CUST_LASTNAME"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_LASTNAMEUN"] =!helper.isNullEmptry(row["CUST_LASTNAMEUN"])?row["CUST_LASTNAMEUN"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_MARITALSTATUS"] =!helper.isNullEmptry(row["CUST_MARITALSTATUS"])?getMarialStstus(row["CUST_MARITALSTATUS"]):'';  
      responseJson["GetCustomerByIDResult"]["CUST_MIDNAME"] =!helper.isNullEmptry(row["CUST_MIDNAME"])?row["CUST_MIDNAME"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_MIDNAMEUN"] =!helper.isNullEmptry(row["CUST_MIDNAMEUN"])?row["CUST_MIDNAMEUN"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_NATID"] =!helper.isNullEmptry(row["CUST_NATID"])?row["CUST_NATID"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_NOTIFICATION_MOBILE"] =!helper.isNullEmptry(row["CUST_NOTIFICATION_MOBILE"])?row["CUST_NOTIFICATION_MOBILE"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_OCCUPATION"] =!helper.isNullEmptry(row["CUST_OCCUPATION"])?row["CUST_OCCUPATION"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_OCCUPATIONUN"] =!helper.isNullEmptry(row["CUST_OCCUPATIONUN"])?row["CUST_OCCUPATIONUN"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PHONEAREACODE"] =!helper.isNullEmptry(row["CUST_PHONEAREACODE"])?row["CUST_PHONEAREACODE"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PHONECOUNTRYCODE"] =!helper.isNullEmptry(row["CUST_PHONECOUNTRYCODE"])?row["CUST_PHONECOUNTRYCODE"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PHONEEXTENSTION"] =!helper.isNullEmptry(row["CUST_PHONEEXTENSTION"])?row["CUST_PHONEEXTENSTION"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PHONELOOKUP"] =!helper.isNullEmptry(row["CUST_PHONELOOKUP"])?row["CUST_PHONELOOKUP"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PHONENUMBER"] =!helper.isNullEmptry(row["CUST_PHONENUMBER"])?row["CUST_PHONENUMBER"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PHONETYPE"] =!helper.isNullEmptry(row["CUST_PHONETYPE"])?row["CUST_PHONETYPE"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_PREFERRED_LANGUAGE"] =!helper.isNullEmptry(row["CUST_PREFERRED_LANGUAGE"])?row["CUST_PREFERRED_LANGUAGE"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_TITLE"] =!helper.isNullEmptry(row["CUST_TITLE"])?row["CUST_TITLE"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_USERDATA1"] =!helper.isNullEmptry(row["CUST_USERDATA1"])?row["CUST_USERDATA1"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_USERDATA1UN"] =!helper.isNullEmptry(row["CUST_USERDATA1UN"])?row["CUST_USERDATA1UN"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_USERDATA2"] =!helper.isNullEmptry(row["CUST_USERDATA2"])?row["CUST_USERDATA2"]:'';  
      responseJson["GetCustomerByIDResult"]["CUST_USERDATA2UN"] =!helper.isNullEmptry(row["CUST_USERDATA2UN"])?row["CUST_USERDATA2UN"]:'';  
      responseJson["GetCustomerByIDResult"]["Loyalty"] =!helper.isNullEmptry(row["Loyalty"])?row["Loyalty"]:'';  
      responseJson["GetCustomerByIDResult"]["PASSWORD"] =!helper.isNullEmptry(row["WCUST_PASSWORD"])?row["WCUST_PASSWORD"]:'';  
      responseJson["GetCustomerByIDResult"]["Settings"] =!helper.isNullEmptry(row["Settings"])?row["Settings"]:'';  
      responseJson["GetCustomerByIDResult"]["UPT_BYUSER"] =!helper.isNullEmptry(row["UPT_BYUSER"])?row["UPT_BYUSER"]:'';  
      responseJson["GetCustomerByIDResult"]["UPT_DATE"] = renderDate(row["UPT_DATE"]);  
      responseJson["GetCustomerByIDResult"]["USERNAME"] =!helper.isNullEmptry(row["WCUST_USERNAME"])?row["WCUST_USERNAME"]:''; 

      responseJson["GetCustomerByIDResult"]["WCUST_ACTIVE_DATE"] = moment(row["WCUST_ACTIVE_DATE"],'YYYY-MM-DDThh:mm:ss.ms').format('YYYY-MM-DDTHH:mm:ss');  
      responseJson["GetCustomerByIDResult"]["WCUST_CORPID"] =!helper.isNullEmptry(row["WCUST_CORPID"])?row["WCUST_CORPID"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_FIRSTNAME"] =!helper.isNullEmptry(row["WCUST_FIRSTNAME"])?row["WCUST_FIRSTNAME"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_HASHEDPASSWORD"] =!helper.isNullEmptry(row["WCUST_HASHEDPASSWORD"])?row["WCUST_HASHEDPASSWORD"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_IS_GUEST"] =!helper.isNullEmptry(row["WCUST_IS_GUEST"])?getIsGuest(row["WCUST_IS_GUEST"]):'';  
      responseJson["GetCustomerByIDResult"]["WCUST_LASTNAME"] =!helper.isNullEmptry(row["WCUST_LASTNAME"])?row["WCUST_LASTNAME"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_MIDNAME"] =!helper.isNullEmptry(row["WCUST_MIDNAME"])?row["WCUST_MIDNAME"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_OFFER1"] =!helper.isNullEmptry(row["WCUST_OFFER1"])?row["WCUST_OFFER1"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_OFFER2"] =!helper.isNullEmptry(row["WCUST_OFFER2"])?row["WCUST_OFFER2"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_SEC_ANSWER"] =!helper.isNullEmptry(row["WCUST_SEC_ANSWER"])?row["WCUST_SEC_ANSWER"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_SEC_QUESTION"] =!helper.isNullEmptry(row["WCUST_SEC_QUESTION"])?row["WCUST_SEC_QUESTION"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_STATUS"] =!helper.isNullEmptry(row["WCUST_STATUS"])?row["WCUST_STATUS"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_TOKEN"] =!helper.isNullEmptry(row["WCUST_TOKEN"])?row["WCUST_TOKEN"]:'';  
      responseJson["GetCustomerByIDResult"]["WCUST_TOKEN_DATE"] = renderDate(row["WCUST_TOKEN_DATE"]);
      responseJson["GetCustomerByIDResult"]["WEB_CRT_BY"] =!helper.isNullEmptry(row["WCUST_WEB_CRT_BY"])?row["WCUST_WEB_CRT_BY"]:'';  
      responseJson["GetCustomerByIDResult"]["WEB_CRT_DATE"] = renderDate(row["WCUST_WEB_CRT_DATE"]); 
      responseJson["GetCustomerByIDResult"]["WEB_UPT_BY"] =!helper.isNullEmptry(row["WCUST_WEB_UPT_BY"])?row["WCUST_WEB_UPT_BY"]:'';  
      responseJson["GetCustomerByIDResult"]["WEB_UPT_DATE"] = renderDate(row["WCUST_WEB_UPT_DATE"]); 

      responseJson["SDKResult"]["ExternalCode"] = '0';
      responseJson["SDKResult"]["ResultCode"] = 'Success';
      responseJson["SDKResult"]["ResultText"] = '';
    }else{
      if(err){
        responseJson["SDKResult"]["ExternalCode"] = '1';
        responseJson["SDKResult"]["ResultCode"] = 'External_Data_Error'; //External_Data_Error = -2
        responseJson["SDKResult"]["ResultText"] = err.message;  
      }else{
        responseJson["SDKResult"]["ExternalCode"] = '0';
        responseJson["SDKResult"]["ResultCode"] = 'Customer does not exist'; //Customer_Does_Not_Exist = 53
        responseJson["SDKResult"]["ResultText"] = 'Customer does not exist';  
      }
    }
    return responseJson;
}

function renderDate(dateVal){
  if(!helper.isNullEmptry(dateVal)){
    return moment(dateVal,'YYYY-MM-DDThh:mm:ss.ms').format('YYYY-MM-DDTHH:mm:ss'); 
  }else{
    return '9000-01-01T00:00:00';
  }
}

function getGender(genderVal){
  let type = 'None';
  switch (genderVal) {
    case 0:
      type = 'Female';
      break;
    case 1:
      type =  'Male';
      break; 
    default:
  };
  return type;
}

function getMarialStstus(marialVal){
  let type = 'None';
  switch (marialVal) {
    case 0:
      type = 'Single';
      break;
    case 1:
      type = 'Married';
      break; 
    case 2:
      type = 'Divorced';
      break; 
    default:
  };
  return type;
}

function getIsGuest(isGuestVal){
  let type = 'false';
  switch (isGuestVal) {
    case 0:
      type = 'false';
      break;
    case 1:
      type = 'true';
      break; 
    default:
  };
  return type;
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