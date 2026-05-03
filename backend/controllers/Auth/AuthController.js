const {Administrator} = require('../../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Use environment variable or fallback to a default secret (in production, always use environment variable)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

// Log the secret being used (remove in production)
console.log('JWT Secret:', ACCESS_TOKEN_SECRET ? '*** (set from environment)' : 'Using development secret');

/*================ login ====================*/ 
const Login = async (req, res) => {
    // Log incoming request details for debugging
    console.log('Login attempt for email:', req.body.email);
    
    const {email , password } = req.body 
    
    if(!email || !password ) {
       return res.status(422).json({'errors' : "the fields email , password is required!"})
    } 

    const administrator =await Administrator.findOne({where : { "email" : email}})
    
    if(!administrator){
      return res.status(422).json({"errors" : 'email not match any Administrator!'})
    }

    const isPasswordValid = await bcrypt.compare(password, administrator.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 'errors': "password not correct!" });
    }

    // Log token generation details
    console.log('Generating token with secret:', 
      ACCESS_TOKEN_SECRET ? '*** (set)' : '*** (not set)'
    );
    
    const tokenPayload = {
      id: administrator.id,
      email: administrator.email,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const token = jwt.sign(
      tokenPayload,
      ACCESS_TOKEN_SECRET,
      { expiresIn: '24h' }
    );
    
    const administratorInfo = {
      id: administrator.id,
      name: administrator.name,
      email: administrator.email
    };
    
    // Log token details
    console.log('Generated token:', {
      header: JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString()),
      payload: JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()),
      signature: token.split('.')[2]?.substring(0, 10) + '...',
      expiresIn: '24h'
    });
    
    res.json({
      message: 'Login successful',
      token: token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
      administrator: administratorInfo
    });
}

/*================ register ====================*/ 
const Register = async (req , res ) => {
    const {name , email , password , passwordConfirmation } = req.body 

    if(!name || !email || !password || !passwordConfirmation ) {
       return res.status(422).json({'errors' : "the fields name , email and password , passwordConfirmation is required!"})
    } 

    if(passwordConfirmation != password){
       return res.status(422).json({ "errors" : "should be password same password confiremation !"})
    }
   
    const exestingAdministrator =await Administrator.findOne({where : { email}})
    
    if(exestingAdministrator){
     return res.status(422).json({"errors" : 'email already use !'})
    }
    
   const hashPassword =await bcrypt.hash(password , 10)

   const administrator = await  Administrator.create({
        name : name , 
        email : email , 
        password : hashPassword
    })

    const token = jwt.sign({
        id : administrator.id ,
        email : administrator.email
       } , 
       ACCESS_TOKEN_SECRET
   )

   const administratorInfo = {
      id : administrator.id , 
      name : administrator.name , 
      email : administrator.email
   }
   
   res.json({"message" : 'register Administrator successfuly !' , "token" : token , "administrator" : administratorInfo })
   
}

const Logout = (req , res) => {
     const token = req.headers('Autherization').replace("Bearer " , "")

}

module.exports = {Login , Register}

