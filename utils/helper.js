global.sendResponse = (statusCode, res, message,result,sendArray,type) => {
    let success = false;    
    if (statusCode == 200 || statusCode == 401 ) {
        success = true;
        if (sendArray && result == "") {
            message.data = [];
        } 
        else if(result == "" || result == null )
        {
            if(type == 1)
            {
                 message.data = [];
            }
            else 
            {
                 message.data = {};
            }
        }
        else
        {
             message.data = result;
        }
           
    }
        res
            .status(statusCode)
            .json(message)
    
}