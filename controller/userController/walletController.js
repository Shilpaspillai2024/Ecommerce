const moment = require('moment-timezone');
const orderSchema = require('../../model/orderSchema');
const walletSchema = require('../../model/walletSchema');
const catchAsync = require('../../utils/catchAsync');


const wallet = catchAsync (async (req, res) => {

  
   
        const userId = req.session.user;
    
        
        const wallet = await walletSchema.findOne({ userId }).populate({path: 'transaction.orderId',
    select: 'orderID'});
        
        let balance = 0;
        let walletHistory = [];
        
        if (wallet) {
            balance = wallet.balance;
            walletHistory = wallet.transaction || [];
            
           
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
            formattedDate: istDate.format('DD/MM/YYYY, hh:mm:ss A'),
            orderID: transactionData.orderId?.orderID || '—'
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
        
   
});

module.exports = { wallet };