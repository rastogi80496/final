let iconCart = document.querySelector('.icon-cart');
let closecart = document.querySelector('.close');
let body = document.querySelector('body');
let listProductHTML = document.querySelector('.listProduct');
let listCartHTML = document.querySelector('.listCart');
let iconCartSpan = document.querySelector('.icon-cart span');
let checkout = document.querySelector('.checkOut');

let listProducts = [];
let carts = [];

checkout.addEventListener('click', async () => {
    const formData = new URLSearchParams();

    // Append cart items to formData
    carts.forEach((item, index) => {
        formData.append(`items[${index}][product_id]`, item.product_id);
        formData.append(`items[${index}][quantity]`, item.quantity);
    });

    try {
        const response = await fetch('/send-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const data = await response.json();

        const options = {
            key: "rzp_test_Z8YgAD9JbioskU", // Replace this with your actual Razorpay Key ID
            amount: data.amount,         // Amount in paise
            currency: data.currency,
            name: "Your Company Name",
            description: "Food Order Payment",
            order_id: data.orderId,      // Razorpay Order ID from server
            handler: function (paymentResponse) {
                //alert("Payment Successful!");
                //console.log(paymentResponse);
                window.location.href="/home1";
            },
            theme: {
                color: "#F37254"
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (error) {
        console.error('Error:', error);
        alert('Error placing order or initiating payment.');
    }
});


iconCart.addEventListener('click',()=>{
    body.classList.toggle('showCart');
});

closecart.addEventListener('click',()=>{
    body.classList.toggle('showCart');
});

const addDataToHTML = ()=>{
    listProductHTML.innerHTML = '';
    if(listProducts.length > 0){
        listProducts.forEach(product =>{
            let newProduct = document.createElement('div');
            newProduct.classList.add('item');
            newProduct.dataset.id = product.id;
            newProduct.innerHTML = `
            <img src="${product.image}" alt="image">
                <h2>${product.name}</h2>
                <div class="price">&#8377 ${product.price}</div>
                <button class="addCart">
                    ADD TO CART
                </button>
                `;
                listProductHTML.appendChild(newProduct);

        })
    }
}

listProductHTML.addEventListener('click',(event)=>{
    let positionClick = event.target;
    if(positionClick.classList.contains('addCart')){
        let product_id = positionClick.parentElement.dataset.id;
        addToCart(product_id);
    }
});

const addToCart = (product_id)=>{
    let positionThisProductInCart = carts.findIndex((value) => value.product_id == product_id); 
    if(carts.length <=0){
        carts = [{
            product_id: product_id,
            quantity:1
        }]
    }else if(positionThisProductInCart < 0){
        carts.push({
            product_id : product_id,
            quantity:1
        });
    }else{
        carts[positionThisProductInCart].quantity+=1; 
    }
    addCartToHTML();
    addCartToMemory();
}

const addCartToMemory =() =>{
    localStorage.setItem('cart',JSON.stringify(carts));
}

const addCartToHTML = ()=>{
    listCartHTML.innerHTML = '';
    let totalQuantity =0;
    if(carts.length > 0){
        carts.forEach(cart =>{
            totalQuantity = totalQuantity + cart.quantity;
            let newCart = document.createElement('div');
            newCart.classList.add('item');
            newCart.dataset.id = cart.product_id;
            let positionProduct = listProducts.findIndex((value) => value.id == cart.product_id);
            let info = listProducts[positionProduct];
            newCart.innerHTML = `
                <div class="image">
                    <img src="${info.image}" alt="image">
                </div>
                <div class="name">
                    ${info.name}
                </div>
                <div class="totalPrice">
                    &#8377 ${info.price*cart.quantity}
                </div>
                <div class="quantity">
                    <span class="minus"><</span>
                    <span>${cart.quantity}</span>
                    <span class="plus">></span>
                </div>
            `; 
        listCartHTML.appendChild(newCart); 
        });
    }
    iconCartSpan.innerText = totalQuantity;
}

listCartHTML.addEventListener('click',(event)=>{
    let positionClick = event.target;
    if(positionClick.classList.contains('minus') || positionClick.classList.contains('plus')){
        let product_id = positionClick.parentElement.parentElement.dataset.id;
        let type = 'minus';
        if(positionClick.classList.contains('plus')){
            type = 'plus';
        } 
        changeQuantity(product_id,type);
    }
});

const changeQuantity = (product_id, type)=>{
    let positionItemInCart = carts.findIndex((value) => value.product_id == product_id);
    if (positionItemInCart >= 0){
        switch (type){
            case 'plus':
                carts[positionItemInCart].quantity += 1;
                break;
            default:
                let valueChange = carts[positionItemInCart].quantity - 1;
                if(valueChange > 0){
                    carts[positionItemInCart].quantity = valueChange;
                }else{
                    carts.splice(positionItemInCart,1);
                }
                break;
        }
    }
    addCartToMemory();
    addCartToHTML();
}

const initApp = () =>{
    fetch('product.json')
    .then(response => response.json())
    .then(data =>{
        listProducts = data;
        addDataToHTML();

        /*if(localStorage.getItem('cart')){
            carts = JSON.parse(localStorage.getItem('cart'));
            addCartToHTML();
        }*/
    })
}
initApp();