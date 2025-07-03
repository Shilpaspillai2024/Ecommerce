const mongoose = require('mongoose')
const userSchema = require('../../model/userSchema')
const categorySchema = require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')
const orderSchema = require('../../model/orderSchema')
const fs = require('fs')
const PDFDocument = require('pdfkit-table')
const path = require('path')
const ExcelJS = require('exceljs')
const STATUS_CODES=require("../../constants/statusCodes")




const dashboard = async (req, res) => {
    try {
        // if (req.session.admin) {


        // Ensure admin session exists
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const dataPerPage = 10;  // Number of products per page
        const currentPage = parseInt(req.query.page) || 1;  // Current page from query parameter, default to 1
        const skip = (currentPage - 1) * dataPerPage;

        // Fetching order details for the frontend order table
        const orderDetails = await orderSchema.find()
            .populate('products.productId')
            .skip(skip)
            .limit(dataPerPage)
            .sort({ createdAt: -1 });

        // fetching orderDetails for calculation



        const orderDetailsProfit = await orderSchema.find({ isCancelled: false, status: { $nin: 'pending' } }).populate('products.productId').sort({ createdAt: -1 })


        //total number of orders

        const totalCollections = await orderSchema.countDocuments()

        // Calculate total number of pages for pagination
        const pageNumber = Math.ceil(totalCollections / dataPerPage);

        // current date

        const currentDate = new Date()


        const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)


        // Arrays for daily sales and daily array
        const dailySalesArray = [];
        const dailyArray = [];



        // iterate over the the days from today to month

        let dayIterator = new Date(currentDate)
        while (dayIterator >= startOfMonth) {
            const dayStart = new Date(dayIterator)
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayIterator);
            dayEnd.setHours(23, 59, 59, 999);


            const dayTotal = orderDetailsProfit.reduce((acc, ele) => {
                const eleDate = new Date(ele.createdAt);
                if (eleDate >= dayStart && eleDate <= dayEnd) {
                    return acc + ele.totalPrice;
                }
                return acc;
            }, 0)
            dailySalesArray.push(dayTotal);
            dailyArray.push(dayStart.getDate());

            dayIterator.setDate(dayIterator.getDate() - 1); // Move to the previous day

        }

        // Monthly sales array
        const monthlySalesArray = new Array(12).fill(0); // Initialize array with 12 zeros
        orderDetailsProfit.forEach(order => {
            const month = new Date(order.createdAt).getMonth();
            monthlySalesArray[month] += order.totalPrice;
        });

        // Calculate daily, weekly, and monthly reports
        const dailyReport = calculateReport(orderDetailsProfit, startOfToday);
        const weeklyReport = calculateReport(orderDetailsProfit, startOfWeek);
        const monthlyReport = calculateReport(orderDetailsProfit, startOfMonth);

        // Overall sales amount and count
        const overallSalesAmount = orderDetailsProfit.reduce((acc, ele) => acc + ele.totalPrice, 0);
        const overallSalesCount = orderDetailsProfit.length;




        // Overall discount calculation
        let overallDiscount = orderDetailsProfit.reduce((acc, ele) => {
            return acc + (ele.couponDiscount || 0); // Ensure couponDiscount is a number
        }, 0);

        overallDiscount += orderDetailsProfit.reduce((acc, ele) => {
            return acc + ele.products.reduce((prodAcc, product) => {
                // Ensure product properties are numbers
                const price = typeof product.price === 'number' ? product.price : 0;
                const discount = typeof product.discount === 'number' ? product.discount : 0;
                const quantity = typeof product.quantity === 'number' ? product.quantity : 0;

                return prodAcc + ((price * (discount / 100)) * quantity);
            }, 0);
        }, 0);


        // find the number of payment methods
        let payByCash = 0
        let payByRazorPay = 0
        let payByWallet = 0

        orderDetailsProfit.forEach((order) => {
            if (order.paymentMethod === 'COD') {
                payByCash++;
            }
            if (order.paymentMethod === 'razorpay') {
                payByRazorPay++;
            }
            if (order.paymentMethod === 'Wallet') {
                payByWallet++;
            }
        })

        const paymentMethodChart = [payByCash, payByRazorPay, payByWallet]



        res.render('admin/dashboard',
            {
                admin: req.session.admin,
                title: "admin dashboard",
                alertMessage: req.flash('errorMessage'),
                dailyReport,
                weeklyReport,
                monthlyReport,
                orderDetails,
                overallSalesAmount,
                overallSalesCount,
                overallDiscount,
                dailySalesArray,
                dailyArray,
                pageNumber,
                currentPage,
                monthlySalesArray,
                paymentMethodChart
            })
        // }
    } catch (error) {
        // console.log(`error in dashbord page`)

        console.error(`Error in dashboard page: ${error.message}`);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send('Internal Server Error');

    }
}


// Helper function to calculate report based on start date
function calculateReport(orderDetailsProfit, startDate) {
    return orderDetailsProfit.reduce((acc, ele) => {
        if (new Date(ele.createdAt) >= startDate) {
            return acc + ele.totalPrice;
        }
        return acc;
    }, 0);
}



// generate custom sales report using fetch
const generateCustomSales = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        // Validate start and end dates
        if (!startDate || !endDate) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: "Start date and end date are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set end time to the end of the day

        // Fetch orders within the specified date range
        const orders = await orderSchema.find({ createdAt: { $gte: start, $lte: end }, isCancelled: false });

        // Calculate total sales
        const sale = orders.reduce((acc, order) => acc + order.totalPrice, 0);
        return res.status(STATUS_CODES.OK).json({ message: "Report Generated", sale });
    } catch (err) {
        console.error(`Error on generating custom sales report: ${err}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
};



const downloadPdfReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        // Validate start and end dates
        if (!startDate || !endDate) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: "Start date and end date are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set end time to the end of the day

        // Get the order details from order collection
        const orderDetails = await orderSchema.find({ createdAt: { $gte: start, $lte: end } }).populate('products.productId').sort({ createdAt: -1 });
        const orderDetailsWithoutCancelled = await orderSchema.find({ createdAt: { $gte: start, $lte: end }, isCancelled: false, status: { $nin: 'Pending' } }).populate('products.productId').sort({ createdAt: -1 });

        const doc = new PDFDocument();
        const filename = `WordPlayBooks Sales Report ${Date.now()}.pdf`;

        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        // Add header aligned to center 
        doc.font("Helvetica-Bold").fontSize(36).text("WordPlayBooks", { align: "center", margin: 10 });
        doc.font("Helvetica-Bold").fillColor("grey").fontSize(8).text("Explore the new world of reading", { align: "center", margin: 10 });
        doc.moveDown();



        doc.moveDown();

        // Add address details of the company
        doc.fontSize(10).fillColor("black").text(`Address:kazhakootam,Trivandrum`);
        doc.text(`Pincode: 686543`);
        doc.text(`Phone: 9645201531`);

        doc.moveDown();

        const totalSale = orderDetailsWithoutCancelled.reduce((acc, sum) => acc + sum.totalPrice, 0)
        const totalOrders = orderDetailsWithoutCancelled.length

        // Add total sales report
        doc.text(`Total Orders : ${totalOrders}`);
        doc.fontSize(10).fillColor("red").text(`Total Sales : Rs ${totalSale}`);

        // Move to the next line after the details
        doc.moveDown();

        doc.moveDown(); // Move down after the title
        doc.font("Helvetica-Bold").fillColor("black").fontSize(14).text(`Sales Report`, { align: "center", margin: 10 });
        doc.fontSize(12).text(`From ${startDate} To ${endDate}`, { align: "center", margin: 10 });

        doc.moveDown(); // Move down after the title

        const tableData = {
            headers: [
                "Order ID",
                "Address",
                "Quantity",
                "Status",
                "Total"
            ],
            rows: orderDetails.map((order) => {
                const totalQuantity = order.products.reduce((acc, product) => acc + (product.quantity || 0), 0);
                return [
                    order?._id,
                    order.address?.Address + "\n " + order.address?.areaAddress + "\n " + "Pincode :" + order.address?.pincode,

                    totalQuantity,
                    order?.status,
                    'Rs ' + order?.totalPrice,
                ]
            }),
        };

        // Customize the appearance of the table
        await doc.table(tableData, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: (row, i) => doc.font("Helvetica").fontSize(8),
            hLineColor: '#b2b2b2', // Horizontal line color
            vLineColor: '#b2b2b2', // Vertical line color
            textMargin: 2, // Margin between text and cell border
        });

        // Finalize the PDF document
        doc.end();

    } catch (err) {
        console.error(`Error on downloading PDF sales report: ${err}`);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
};





// download the excel report
const downloadExcelReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        // Validate start and end dates
        if (!startDate || !endDate) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: "Start date and end date are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set end time to the end of the day

        // Get the order details from order collection
        const orderDetails = await orderSchema.find({ createdAt: { $gte: start, $lte: end } }).populate('products.productId').sort({ createdAt: -1 });
        const orderDetailsWithoutCancelled = await orderSchema.find({ createdAt: { $gte: start, $lte: end }, isCancelled: false, status: { $nin: 'Pending' } }).populate('products.productId').sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sheet 1");

        // Add data columns to the worksheet
        worksheet.columns = [
            { header: "Reference ID", key: "orderId", width: 15 },
            { header: "Product", key: "productName", width: 20 },
            { header: "Price", key: "price", width: 15 },
            { header: "Quantity", key: "quantity", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Address", key: "address", width: 30 },
            { header: "Pincode", key: "pin", width: 15 },
            { header: "Order Date", key: "orderDate", width: 18 },
        ];

        let totalSale = 0;
        let totalOrders = 0;

        // Add rows for each order and accumulate totals
        for (const order of orderDetails) {
            const orderId = order._id;
            const orderDate = order.createdAt;
            const address = order.address?.Address + ', ' + order.address?.areaAddress;
            const pin = order.address.pincode;
            const status = order.status;
            let orderTotal = 0;

            for (const item of order.products) {


                const price = Number(item.price) || 0;
                const discount = Number(item.discount) || 0;
                const quantity = Number(item.quantity) || 0;
                const totalPrice = (price - discount) * quantity;

                // const totalPrice = (item.price - item.discount) * item.quantity;
                orderTotal += totalPrice;
                worksheet.addRow({
                    orderId,
                    status,
                    orderDate,
                    address,
                    pin,
                    productName: item.productName,
                    // price: item.price - item.discount,

                    price: price - discount,
                    quantity: item.quantity
                });
            }

            totalSale += orderTotal;
            totalOrders++;
        }

        // Add totals row at the end of the worksheet
        worksheet.addRow({
            orderId: "Total",
            productName: "",
            price: "",
            quantity: "",
            status: "",
            address: "",
            pin: "",
            orderDate: ""
        });

        worksheet.mergeCells(`A${worksheet.rowCount}:D${worksheet.rowCount}`);
        worksheet.getCell(`A${worksheet.rowCount}`).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(`A${worksheet.rowCount}`).font = { bold: true };
        worksheet.getCell(`A${worksheet.rowCount}`).value = `Total Orders: ${totalOrders}`;

        worksheet.getCell(`E${worksheet.rowCount}`).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(`E${worksheet.rowCount}`).font = { bold: true };
        worksheet.getCell(`E${worksheet.rowCount}`).value = `Total Sale: ${totalSale}`;

        // Generate the Excel file and send it as a response
        workbook.xlsx.writeBuffer().then((buffer) => {
            const excelBuffer = Buffer.from(buffer);
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader("Content-Disposition", "attachment; filename=excel.xlsx");
            res.send(excelBuffer);
        });

    } catch (err) {
        console.log(`Error on downloading excel sales report fetch ${err}`);
    }
}



const category = async (req, res) => {
    try {
        const categorySearch = req.query.categorySearch || '';

        const categoriesPerPage = 5;
        const currentPage = parseInt(req.query.page) || 1;
        const skip = (currentPage - 1) * categoriesPerPage;
        const totalCategories = await categorySchema.countDocuments({ categoryName: { $regex: categorySearch, $options: 'i' } });
        const category = await categorySchema.find({ categoryName: { $regex: categorySearch, $options: 'i' } })
            .skip(skip)
            .limit(categoriesPerPage);


        const pageNumber = Math.ceil(totalCategories / categoriesPerPage);

        res.render('admin/category', {
            admin: req.session.admin, title: "Category List", category,
            alertMessage: req.flash('errorMessage'),
            currentPage,
            pageNumber,
            categorySearch
        })


    } catch (error) {
        console.log('error')

    }
}

// adding new category from model to datamodel



const addCategoryPost = async (req, res) => {
    try {
        let categoryName = req.body.Newcategory;

        // Convert the category name to lowercase for case-insensitive comparison
        const lowerCaseCategoryName = categoryName.toLowerCase();

        const category = {
            categoryName: categoryName,
            categoryAddedOn: new Date(),
            isActive: true
        }

        // Check if a category with the same name exists (case-insensitive)
        const checkCategory = await categorySchema.findOne({ categoryName: { $regex: new RegExp('^' + lowerCaseCategoryName + '$', 'i') } });

        if (!checkCategory) {
            // Category doesn't exist, insert the new category
            await categorySchema.insertMany(category).then(() => {
                req.flash('errorMessage', 'New category added');
                console.log(`New category added`);
                res.redirect('/admin/category');
            }).catch((err) => {
                console.log(`Error occurred during adding new category ${err}`);
                req.flash('errorMessage', 'Error occurred during adding new category');
                res.redirect('/admin/category');
            });
        } else {
            // Category already exists
            req.flash('errorMessage', 'Category already present');
            res.redirect('/admin/category');
        }
    } catch (err) {
        console.log(`Error in adding category ${err}`);
        req.flash('errorMessage', 'Error in adding category');
        res.redirect('/admin/category');
    }
}



// edit cateory from model 

const editCategoryPost = async (req, res) => {
    try {

        const id = req.body.catid
        const name = req.body.catname

        const lowerCaseCategoryName = name.toLowerCase();


        const checkCat = await categorySchema.findOne({ categoryName: { $regex: new RegExp('^' + lowerCaseCategoryName + '$', 'i') } })

        if (checkCat == null) {
            await categorySchema.findByIdAndUpdate(id, { categoryName: name })
            req.flash('errorMessage', 'Success: Category update successfully')
            res.redirect('/admin/category')
        } else {
            req.flash('errorMessage', 'Warning: Category already exists. Please ensure no duplicates are being added.')
            res.redirect("/admin/category")
        }

    } catch (err) {
        console.log(`error in editing category ${err}`)
    }
}

//delete category

const deleteCategory = async (req, res) => {
    try {
        const CatId = req.params.id

        const deleteCat = await categorySchema.findByIdAndDelete(CatId)
        if (deleteCat != null) {
            req.flash('errorMessage', 'Category Deleted successfully')
            res.redirect('/admin/category')
        }
        else {
            req.flash('errorMessage', 'unable to delete the category')
            res.redirect('/admin/category')
        }

    } catch (err) {
        console.log(`error in deleting category ${err}`)

    }
}

// deactivatecategory

const deactivateCategory = async (req, res) => {
    try {

        const deactId = req.params.id


        const category = await categorySchema.findById(deactId);


        if (category) {
            // Deactivate the category
            await categorySchema.findByIdAndUpdate(deactId, { isActive: false });

            // Deactivate all products under this category
            await productSchema.updateMany({ productCategory: category.categoryName }, { isActive: false });

            res.redirect('/admin/category');
        } else {
            res.status(STATUS_CODES.NOT_FOUND).send("Category not found");
        }


    } catch (err) {

        console.log(`error during deactivating the category ${err}`)

    }
}

// activateCategory
const activateCategory = async (req, res) => {
    try {
        const actId = req.params.id;

        // Find the category by ID
        const category = await categorySchema.findById(actId);

        if (category) {
            // Activate the category
            await categorySchema.findByIdAndUpdate(actId, { isActive: true });

            // Activate all products under this category
            await productSchema.updateMany({ productCategory: category.categoryName }, { isActive: true });

            res.redirect('/admin/category');
        } else {
            res.status(STATUS_CODES.NOT_FOUND).send("Category not found");
        }
    } catch (err) {
        console.log(`Error during activating the category: ${err}`);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Server Error");
    }
}

module.exports = {
    dashboard,
    generateCustomSales,
    downloadPdfReport,
    downloadExcelReport,
    category,
    addCategoryPost,
    editCategoryPost,
    deleteCategory,
    deactivateCategory,
    activateCategory
}