var STATUS_MSG = {
    ERROR : {
        SOME_ERROR_FOND: {
            statusCode:400,
            customMessage : 'Some Error Occured',
            data : 'NOT_FOUND'
        },
        USER_EXISTS: {
            statusCode:409,
            customMessage : 'User Already Exists',
            data : 'NOT_FOUND'
        },
        USER_DOESNT_EXISTS: {
            statusCode:409,
            customMessage : 'User does not Exists',
            data : 'NOT_FOUND'
        },
        INCORRECT_PASSWORD: {
            statusCode:409,
            customMessage : 'Incorrect Password',
            data : 'NOT_FOUND'
        },
        INVALID_TOKEN : {
            statusCode:401,
            customMessage : 'Invalid Token ',
            data : 'INVALID_TOKEN'
            
        },
    }
}
var customMessage = {
    SUCCESS : {
        statusCode:200,
        customMessage : 'Success',
        data : {}
    },
    USER_CREATED : {
        statusCode:200,
        customMessage : 'User created successfully',
        data : {}
    },
    LOGIN:{
        statusCode:200,
        customMessage : 'User Logged in successfully',
        data : {}
    },
    PASSWORD_UPDATED:{
        statusCode:200,
        customMessage : 'User password updated successfully',
        data : {}
    },
    USER_DELETED:{
        statusCode:200,
        customMessage : 'User deleted successfully',
        data : {}
    }

}

var APP_CONSTANTS = {   
    
    STATUS_MSG: STATUS_MSG,    
    customMessage : customMessage,
  };

module.exports = APP_CONSTANTS;