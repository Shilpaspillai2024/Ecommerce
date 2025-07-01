// const moment=require('moment-timezone')
// const orderSchema=require('../../model/orderSchema')
// const walletSchema=require('../../model/walletSchema')



// const wallet=async(req,res)=>{
//     try {

//         const userId = req.session.user
//         const wallet=await walletSchema.findOne({userId})

//         let balance=0;
//         let walletHistory=[];

//         if(wallet){
//             balance= wallet.balance;
//             walletHistory=wallet.transaction || [];
//         }

//      //   const walletHistory= wallet ? wallet.transaction:[]
//         walletHistory.sort((a,b)=>new Date(b.date)- new Date(a.date))

//         const page=parseInt(req.query.page) || 1;
//         const perPage=5;
//         const totalTransactions =walletHistory.length;
//         const totalPages = Math.ceil(totalTransactions / perPage);

//         console.log('Total Transactions:',totalTransactions);

//         console.log('Total Pages:', totalPages);

//         console.log('Current Page:', page);


//           const startIndex = (page - 1) * perPage;
//           const endIndex = page * perPage;

//         // Get paginated transactions and format dates
//         const paginatedHistory = walletHistory
//             .slice(startIndex, endIndex)
//             .map(transaction => ({
//                 ...transaction._doc || transaction,
//                 formattedDate: moment(transaction.date).tz('Asia/Kolkata').format('DD/MM/YYYY, hh:mm A')
//             }));

      
//      res.render('user/wallet',
//         {
//         title:'wallet',
//         user:req.session.user,
//         balance,
//         walletHistory:paginatedHistory,
//         currentPage:page,
//         totalPages,
//         totalTransactions,
//         alertMessage: req.flash('errorMessage')})


        
//     } catch (err) {

//         console.log(`error while rendering the wallet ${err}`)

        
//     }
// }


// module.exports={wallet}


const moment = require('moment-timezone');
const orderSchema = require('../../model/orderSchema');
const walletSchema = require('../../model/walletSchema');

const wallet = async (req, res) => {

    console.log('Wallet controller triggered');
    try {
        const userId = req.session.user;
        console.log('User ID:', userId); // Debug log
        
        const wallet = await walletSchema.findOne({ userId });
        console.log('Wallet found:', wallet); // Debug log
        
        let balance = 0;
        let walletHistory = [];
        
        if (wallet) {
            balance = wallet.balance;
            walletHistory = wallet.transaction || [];
            
            // Debug logs
            console.log('Balance:', balance);
            console.log('Raw wallet history:', walletHistory);
            console.log('Wallet history length:', walletHistory.length);
            
            // Check if transactions exist and have proper structure
            if (walletHistory.length > 0) {
                console.log('First transaction:', walletHistory[0]);
                console.log('First transaction date:', walletHistory[0].date);
            }
        } else {
            console.log('No wallet found for user:', userId);
        }
        
        // Sort transactions by date (newest first)
        walletHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const page = parseInt(req.query.page) || 1;
        const perPage = 5;
        const totalTransactions = walletHistory.length;
        const totalPages = Math.ceil(totalTransactions / perPage);
        
        console.log('Total Transactions:', totalTransactions);
        console.log('Total Pages:', totalPages);
        console.log('Current Page:', page);
        
        const startIndex = (page - 1) * perPage;
        const endIndex = page * perPage;
        
        const paginatedHistory = walletHistory
    .slice(startIndex, endIndex)
    .map(transaction => {
        // Convert to plain object if it's a Mongoose document
        const transactionData = transaction.toObject ? transaction.toObject() : transaction;

        const istDate = moment.utc(transactionData.date).tz('Asia/Kolkata');
        
        return {
            ...transactionData,
            formattedDate: istDate.format('DD/MM/YYYY, hh:mm:ss A')
        };
    });

        
        console.log('Paginated history:', paginatedHistory);
        
        res.render('user/wallet', {
            title: 'wallet',
            user: req.session.user,
            balance,
            walletHistory: paginatedHistory,
            currentPage: page,
            totalPages,
            totalTransactions,
            alertMessage: req.flash('errorMessage')
        });
        
    } catch (err) {
        console.log(`Error while rendering the wallet: ${err}`);
        console.error(err.stack); // More detailed error logging
    }
};

module.exports = { wallet };