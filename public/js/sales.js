// DOM Elements - Navigation
const dashboardLink = document.getElementById('dashboardLink');
const productsLink = document.getElementById('productsLink');
const salesLink = document.getElementById('salesLink');
const ordersLink = document.getElementById('ordersLink');
const logoutBtn = document.getElementById('logoutBtn');

// DOM Elements - Sections
const salesSection = document.getElementById('salesSection');
const checkoutSection = document.getElementById('checkoutSection');
const receiptSection = document.getElementById('receiptSection');
const ordersSection = document.getElementById('ordersSection');
const orderDetailsSection = document.getElementById('orderDetailsSection');

// DOM Elements - User Info
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');

// DOM Elements - Products and Cart
const productSearch = document.getElementById('productSearch');
const productsList = document.getElementById('productsList');
const cartItems = document.getElementById('cartItems');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');

// DOM Elements - Checkout
const checkoutForm = document.getElementById('checkoutForm');
const customerName = document.getElementById('customerName');
const paymentMethod = document.getElementById('paymentMethod');
const orderItems = document.getElementById('orderItems');
const orderSubtotal = document.getElementById('orderSubtotal');
const orderTotal = document.getElementById('orderTotal');
const backToCartBtn = document.getElementById('backToCartBtn');

// DOM Elements - Receipt
const receiptNumber = document.getElementById('receiptNumber');
const receiptDate = document.getElementById('receiptDate');
const receiptCashier = document.getElementById('receiptCashier');
const receiptItemsList = document.getElementById('receiptItemsList');
const receiptTotal = document.getElementById('receiptTotal');
const receiptPaymentMethod = document.getElementById('receiptPaymentMethod');
const printReceiptBtn = document.getElementById('printReceiptBtn');
const newSaleBtn = document.getElementById('newSaleBtn');

// DOM Elements - Orders
const ordersList = document.getElementById('ordersList');
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');

// Alert element
const alertElement = document.getElementById('alert');

// API URLs
const AUTH_API_URL = '/api/auth';
const PRODUCTS_API_URL = '/api/products';
const SALES_API_URL = '/api/sales';

// Global variables
let allProducts = [];
let cart = [];
let currentOrder = null;
let allOrders = [];

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if no token
        window.location.href = 'login.html';
        return;
    }
    
    // Get user info
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Display user info
        userName.textContent = user.fullname;
        userRole.textContent = user.role;
        
        // Hide dashboard and products links for clients
        if (user.role === 'cliente') {
            // Hide dashboard and products links
            if (dashboardLink) dashboardLink.parentElement.style.display = 'none';
            if (productsLink) productsLink.parentElement.style.display = 'none';
        }
    } else {
        // No user info, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // Load products for sales
    loadProducts();
    
    // Load payment methods
    loadPaymentMethods();
    
    // Add search functionality for products
    productSearch.addEventListener('input', filterProducts);
});

// Event Listeners - Navigation
productsLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'dashboard.html';
});

salesLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(salesSection);
    setActiveLink(salesLink);
});

ordersLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(ordersSection);
    setActiveLink(ordersLink);
    loadOrders();
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// Event Listeners - Cart and Checkout
checkoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
        showSection(checkoutSection);
        updateOrderSummary();
    }
});

backToCartBtn.addEventListener('click', () => {
    showSection(salesSection);
});

checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createOrder();
});

// Event Listeners - Receipt
printReceiptBtn.addEventListener('click', () => {
    printReceipt();
});

newSaleBtn.addEventListener('click', () => {
    resetSale();
    showSection(salesSection);
});

// Event Listeners - Orders
refreshOrdersBtn.addEventListener('click', () => {
    loadOrders();
});

// Functions - Navigation
function showSection(section) {
    // Hide all sections
    salesSection.classList.add('hidden');
    checkoutSection.classList.add('hidden');
    receiptSection.classList.add('hidden');
    ordersSection.classList.add('hidden');
    orderDetailsSection.classList.add('hidden');
    
    // Show the selected section
    section.classList.remove('hidden');
}

function setActiveLink(link) {
    // Remove active class from all links
    dashboardLink.classList.remove('active');
    productsLink.classList.remove('active');
    salesLink.classList.remove('active');
    ordersLink.classList.remove('active');
    
    // Add active class to the selected link
    link.classList.add('active');
}

// Functions - Products
async function loadProducts() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show loading state
        productsList.innerHTML = '<div class="col-12"><p class="text-center">Loading products...</p></div>';
        
        // Fetch products
        const response = await fetch(PRODUCTS_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            allProducts = result.data;
            displayProducts(allProducts);
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch products: ' + error.message, 'danger');
    }
}

function displayProducts(products) {
    if (products.length === 0) {
        productsList.innerHTML = '<div class="col-12"><p class="text-center">No products found.</p></div>';
        return;
    }
    
    let productsHTML = '';
    
    products.forEach(product => {
        // Skip products with no stock
        if (product.stock <= 0) {
            return;
        }
        
        productsHTML += `
            <div class="col-md-4 mb-3">
                <div class="card product-card" data-id="${product.id}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text">${product.description || 'No description'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">$${product.price.toFixed(2)}</span>
                            <span class="badge bg-secondary">Stock: ${product.stock}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2 add-to-cart-btn" data-id="${product.id}">
                            <i class="bi bi-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    productsList.innerHTML = productsHTML;
    
    // Add event listeners to add-to-cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click event
            const productId = parseInt(button.getAttribute('data-id'));
            addToCart(productId);
        });
    });
    
    // Add event listeners to product cards for quick add
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = parseInt(card.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

function filterProducts() {
    const searchTerm = productSearch.value.toLowerCase();
    
    if (searchTerm === '') {
        displayProducts(allProducts);
        return;
    }
    
    const filteredProducts = allProducts.filter(product => {
        return (
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    });
    
    displayProducts(filteredProducts);
}

// Functions - Cart
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        showAlert('Product not found', 'danger');
        return;
    }
    
    if (product.stock <= 0) {
        showAlert('Product is out of stock', 'warning');
        return;
    }
    
    // Check if product is already in cart
    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
        // Check if we have enough stock
        if (existingItem.quantity >= product.stock) {
            showAlert('Not enough stock available', 'warning');
            return;
        }
        
        // Increment quantity
        existingItem.quantity += 1;
        existingItem.subtotal = existingItem.quantity * existingItem.unit_price;
    } else {
        // Add new item to cart
        cart.push({
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            subtotal: product.price
        });
    }
    
    updateCart();
    showAlert(`${product.name} added to cart`, 'success');
}

function updateCart() {
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="text-center text-muted">No items in cart</p>';
        cartSubtotal.textContent = '$0.00';
        cartTotal.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
    }
    
    let cartHTML = '';
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        subtotal += item.subtotal;
        
        cartHTML += `
            <div class="cart-item">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${item.product_name}</h6>
                    <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-secondary me-2">$${item.unit_price.toFixed(2)}</span>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-secondary decrease-qty" data-index="${index}">
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="btn btn-outline-secondary">${item.quantity}</span>
                            <button class="btn btn-outline-secondary increase-qty" data-index="${index}">
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                    </div>
                    <span>$${item.subtotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = cartHTML;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartTotal.textContent = `$${subtotal.toFixed(2)}`;
    checkoutBtn.disabled = false;
    
    // Add event listeners to cart item buttons
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            removeFromCart(index);
        });
    });
    
    document.querySelectorAll('.decrease-qty').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            decreaseQuantity(index);
        });
    });
    
    document.querySelectorAll('.increase-qty').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            increaseQuantity(index);
        });
    });
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        cart.splice(index, 1);
        updateCart();
        showAlert(`${item.product_name} removed from cart`, 'info');
    }
}

function decreaseQuantity(index) {
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        
        if (item.quantity > 1) {
            // Decrease quantity
            item.quantity -= 1;
            item.subtotal = item.quantity * item.unit_price;
            updateCart();
        } else {
            // Remove item if quantity would be 0
            removeFromCart(index);
        }
    }
}

function increaseQuantity(index) {
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        const product = allProducts.find(p => p.id === item.product_id);
        
        if (product && item.quantity < product.stock) {
            // Increase quantity if stock allows
            item.quantity += 1;
            item.subtotal = item.quantity * item.unit_price;
            updateCart();
        } else {
            showAlert('Not enough stock available', 'warning');
        }
    }
}

// Functions - Checkout
function updateOrderSummary() {
    if (cart.length === 0) {
        return;
    }
    
    let orderItemsHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        subtotal += item.subtotal;
        
        orderItemsHTML += `
            <div class="cart-item">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${item.product_name}</h6>
                    <span class="badge bg-secondary">${item.quantity}x</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span>$${item.unit_price.toFixed(2)} each</span>
                    <span>$${item.subtotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    
    orderItems.innerHTML = orderItemsHTML;
    orderSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    orderTotal.textContent = `$${subtotal.toFixed(2)}`;
}

async function loadPaymentMethods() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Fetch payment methods
        const response = await fetch(`${SALES_API_URL}/payment-methods`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            const methods = result.data;
            
            // Populate payment method dropdown
            let optionsHTML = '<option value="" selected disabled>Select payment method</option>';
            
            methods.forEach(method => {
                optionsHTML += `<option value="${method.name}">${method.name}</option>`;
            });
            
            paymentMethod.innerHTML = optionsHTML;
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch payment methods: ' + error.message, 'danger');
    }
}

async function createOrder() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Validate form
        if (!paymentMethod.value) {
            showAlert('Please select a payment method', 'warning');
            return;
        }
        
        // Prepare order data
        const orderData = {
            customer_name: customerName.value || 'Guest',
            payment_method: paymentMethod.value,
            items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity
            }))
        };
        
        // Create order
        const response = await fetch(`${SALES_API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Store current order for receipt
            currentOrder = result.data;
            
            // Show receipt
            generateReceipt(currentOrder);
            showSection(receiptSection);
            
            // Show success message
            showAlert('Order created successfully!', 'success');
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to create order: ' + error.message, 'danger');
    }
}

// Functions - Receipt
function generateReceipt(order) {
    // Set receipt details
    receiptNumber.textContent = `REC-${order.id.toString().padStart(6, '0')}`;
    receiptDate.textContent = new Date().toLocaleDateString();
    receiptCashier.textContent = JSON.parse(localStorage.getItem('user')).fullname;
    receiptPaymentMethod.textContent = order.payment_method;
    
    // Generate receipt items
    let itemsHTML = '';
    let total = 0;
    
    order.items.forEach(item => {
        total += item.subtotal;
        
        itemsHTML += `
            <tr>
                <td>${item.product_name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">$${item.unit_price.toFixed(2)}</td>
                <td class="text-end">$${item.subtotal.toFixed(2)}</td>
            </tr>
        `;
    });
    
    receiptItemsList.innerHTML = itemsHTML;
    receiptTotal.textContent = `$${total.toFixed(2)}`;
}

function printReceipt() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Get the receipt content
    const receiptContent = document.getElementById('receiptContent').innerHTML;
    
    // Create a simple HTML document with the receipt content
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .receipt { max-width: 800px; margin: 0 auto; }
                .receipt-header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed #ccc; }
                .receipt-items { margin-bottom: 20px; }
                .receipt-total { font-weight: bold; text-align: right; padding-top: 10px; border-top: 1px solid #eee; }
                .receipt-footer { text-align: center; margin-top: 30px; font-size: 0.9rem; color: #6c757d; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="receipt">
                ${receiptContent}
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

function resetSale() {
    // Clear cart
    cart = [];
    updateCart();
    
    // Reset current order
    currentOrder = null;
    
    // Reset checkout form
    checkoutForm.reset();
}

// Functions - Orders
async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show loading state
        ordersList.innerHTML = '<p class="text-center text-muted">Loading orders...</p>';
        
        // Fetch orders
        const response = await fetch(`${SALES_API_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            allOrders = result.data;
            displayOrders(allOrders);
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch orders: ' + error.message, 'danger');
    }
}

function displayOrders(orders) {
    if (orders.length === 0) {
        ordersList.innerHTML = '<p class="text-center text-muted">No orders found.</p>';
        return;
    }
    
    let ordersHTML = '';
    
    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const time = new Date(order.created_at).toLocaleTimeString();
        
        ordersHTML += `
            <div class="list-group-item order-card" data-id="${order.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-1">Order #${order.id}</h5>
                    <span class="badge bg-primary">$${order.total_amount.toFixed(2)}</span>
                </div>
                <p class="mb-1">Customer: ${order.customer_name || 'Guest'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${date} at ${time}</small>
                    <div>
                        <span class="badge bg-secondary me-1">${order.payment_method}</span>
                        <span class="badge bg-success">${order.order_status}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    ordersList.innerHTML = ordersHTML;
    
    // Add event listeners to order cards
    document.querySelectorAll('.order-card').forEach(card => {
        card.addEventListener('click', () => {
            const orderId = parseInt(card.getAttribute('data-id'));
            viewOrderDetails(orderId);
        });
    });
}

async function viewOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Fetch order details
        const response = await fetch(`${SALES_API_URL}/orders/${orderId}/receipt`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            // Store current order for receipt
            currentOrder = result.data.order;
            
            // Show receipt
            generateReceipt(currentOrder);
            showSection(receiptSection);
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch order details: ' + error.message, 'danger');
    }
}

// Utility Functions
function showAlert(message, type) {
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    // Hide alert after 3 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}