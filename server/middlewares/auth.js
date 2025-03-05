import jwt from 'jsonwebtoken';

export const userAuth = async (req, res, next) => {

       const {token} = req.headers;

       if(!token){
        return res.status(400).json({
            success: false,
            message: "Not authorized, Login again",
        })
       }

       try{
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        if(decode.id){
            req.body.userId = decode.id;
        }
        else{
            return res.status(400).json({
                success: false,
                message: "Not authorized, Login again",
            })
        }
        next();
       }
       catch(err){
        res.status(500).json({
            success: false,
            message: "Something went wrong while validating the token",
            error: err.message,
        });
       }
};