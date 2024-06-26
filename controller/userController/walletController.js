const orderSchema=require('../../model/orderSchema')
const walletSchema=require('../../model/walletSchema')


const wallet=async(req,res)=>{
    try {

        const userId = req.session.user
        const wallet=await walletSchema.findOne({userId})

        let balance=0;

        if(wallet){
            balance= wallet.balance
        }

        const walletHistory= wallet ? wallet.transaction:[]
        walletHistory.sort((a,b)=>b.date - a.date)

     res.render('user/wallet',{title:'wallet',user:req.session.user,balance,walletHistory,alertMessage: req.flash('errorMessage')})


        
    } catch (err) {

        console.log(`error while rendering the wallet ${err}`)

        
    }
}


module.exports={wallet}