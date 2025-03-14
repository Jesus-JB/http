// DOM Elements - Navigation
const dashboardLink = document.getElementById('dashboardLink');
const productsLink = document.getElementById('productsLink');
const usersLink = document.getElementById('usersLink');
const usersNavItem = document.getElementById('usersNavItem');
const logoutBtn = document.getElementById('logoutBtn');

// DOM Elements - Sections
const dashboardSection = document.getElementById('dashboardSection');
const productsSection = document.getElementById('productsSection');
const usersSection = document.getElementById('usersSection');

// DOM Elements - User Info
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');

// DOM Elements - Dashboard Stats
const totalProducts = document.getElementById('totalProducts');
const totalAdmins = document.getElementById('totalAdmins');
const totalEmployees = document.getElementById('totalEmployees');
const productsStatsCard = document.getElementById('productsStatsCard');
const adminsStatsCard = document.getElementById('adminsStatsCard');
const employeesStatsCard = document.getElementById('employeesStatsCard');

// DOM Elements - User Management
const userForm = document.getElementById('userForm');
const userFormTitle = document.getElementById('userFormTitle');
const userIdInput = document.getElementById('userId');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const fullnameInput = document.getElementById('fullname');
const roleInput = document.getElementById('role');
const cancelEditBtn = document.getElementById('cancelEdit');
const refreshUsersBtn = document.getElementById('refreshUsers');
const usersList = document.getElementById('usersList');
const userTemplate = document.getElementById('userTemplate');
const alertElement = document.getElementById('alert');
const userSearchInput = document.getElementById('userSearch');

// Store users data globally for filtering
let allUsers = [];

// API URLs
const AUTH_API_URL = '/api/auth';
const PRODUCTS_API_URL = '/api/products';

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
        // Check if user is a client - they shouldn't access dashboard
        if (user.role === 'cliente') {
            // Redirect clients to sales page
            window.location.href = 'sales.html';
            return;
        }
        
        // Display user info
        userName.textContent = user.fullname;
        userRole.textContent = user.role;
        
        // Show user management section for both admin and employees
        // But hide the form for employees (read-only access)
        if (user.role !== 'admin') {
            // Hide the user form for employees (read-only access)
            document.querySelector('#userForm').closest('.card').style.display = 'none';
        }
    } else {
        // No user info, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // Load dashboard data
    loadDashboardData();
    
    // Add search functionality for users
    if (userSearchInput) {
        userSearchInput.addEventListener('input', filterUsers);
    }
});

// Event Listeners - Navigation
dashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(dashboardSection);
    setActiveLink(dashboardLink);
    loadDashboardData();
});

productsLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(productsSection);
    setActiveLink(productsLink);
    loadProductsSection();
});

usersLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(usersSection);
    setActiveLink(usersLink);
    fetchUsers();
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// Event Listeners - Dashboard Stats Cards
productsStatsCard.addEventListener('click', () => {
    showProductsList();
});

adminsStatsCard.addEventListener('click', () => {
    // Navigate to users section first
    showSection(usersSection);
    setActiveLink(usersLink);
    fetchUsers();
    // Apply filter for admin users
    setTimeout(() => {
        if (userSearchInput) {
            userSearchInput.value = 'admin';
            filterUsers();
        }
    }, 500);
});

employeesStatsCard.addEventListener('click', () => {
    // Navigate to users section first
    showSection(usersSection);
    setActiveLink(usersLink);
    fetchUsers();
    // Apply filter for employee users
    setTimeout(() => {
        if (userSearchInput) {
            userSearchInput.value = 'employee';
            filterUsers();
        }
    }, 500);
});

// Add event listener for clients stats card if it exists
const clientesStatsCard = document.getElementById('clientesStatsCard');
if (clientesStatsCard) {
    clientesStatsCard.addEventListener('click', () => {
        // Navigate to users section first
        showSection(usersSection);
        setActiveLink(usersLink);
        fetchUsers();
        // Apply filter for cliente users
        setTimeout(() => {
            if (userSearchInput) {
                userSearchInput.value = 'cliente';
                filterUsers();
            }
        }, 500);
    });
}

// Event Listeners - User Management
userForm.addEventListener('submit', handleUserFormSubmit);
cancelEditBtn.addEventListener('click', resetUserForm);
refreshUsersBtn.addEventListener('click', fetchUsers);

// Functions - Navigation
function showSection(section) {
    // Hide all sections
    dashboardSection.classList.add('hidden');
    productsSection.classList.add('hidden');
    usersSection.classList.add('hidden');
    
    // Show the selected section
    section.classList.remove('hidden');
}

function setActiveLink(link) {
    // Remove active class from all links
    dashboardLink.classList.remove('active');
    productsLink.classList.remove('active');
    usersLink.classList.remove('active');
    
    // Add active class to the selected link
    link.classList.add('active');
}

// Functions - Dashboard
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Fetch products count
        const productsResponse = await fetch(PRODUCTS_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            totalProducts.textContent = productsData.data.length;
        }
        
        // Fetch users count (for both admin and employees)
        const usersResponse = await fetch(`${AUTH_API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const admins = usersData.data.filter(user => user.role === 'admin');
            const employees = usersData.data.filter(user => user.role === 'employee');
            const clientes = usersData.data.filter(user => user.role === 'cliente');
            
            totalAdmins.textContent = admins.length;
            totalEmployees.textContent = employees.length;
            
            // Update clients count if the element exists
            const totalClientes = document.getElementById('totalClientes');
            if (totalClientes) {
                totalClientes.textContent = clientes.length;
            }
        }
    } catch (error) {
        showAlert('Failed to load dashboard data: ' + error.message, 'danger');
    }
}

// Functions - Products Section
function loadProductsSection() {
    // Redirect to the products page in an iframe or load the content
    productsSection.innerHTML = `
        <h2 class="section-title">Products Management</h2>
        <div class="ratio ratio-16x9" style="height: 80vh;">
            <iframe src="index.html" title="Products Management" allowfullscreen></iframe>
        </div>
    `;
}

// Function to display products list directly
async function showProductsList() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show products section but with custom content
        showSection(productsSection);
        setActiveLink(dashboardLink); // Keep dashboard link active instead of products link
        
        // Set loading state
        productsSection.innerHTML = `
            <h2 class="section-title">Products List</h2>
            <div class="card">
                <div class="card-body">
                    <p>Loading products...</p>
                </div>
            </div>
        `;
        
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
            const products = result.data;
            
            // Create products list HTML
            let productsHTML = `
                <h2 class="section-title">Products List</h2>
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h3 class="card-title mb-0">All Products (${products.length})</h3>
                            <button id="backToDashboard" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-arrow-left"></i> Back to Dashboard
                            </button>
                        </div>
                        <div class="row" id="productsListView">
            `;
            
            if (products.length === 0) {
                productsHTML += `<div class="col-12"><p class="text-center">No products found.</p></div>`;
            } else {
                products.forEach(product => {
                    productsHTML += `
                        <div class="col-md-4 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h5 class="card-title">${product.name}</h5>
                                    <p class="card-text">${product.description || 'No description'}</p>
                                    <div class="d-flex justify-content-between">
                                        <span class="badge bg-primary">$${product.price.toFixed(2)}</span>
                                        <span class="badge bg-secondary">Stock: ${product.stock || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            productsHTML += `
                        </div>
                    </div>
                </div>
            `;
            
            productsSection.innerHTML = productsHTML;
            
            // Add event listener to back button
            document.getElementById('backToDashboard').addEventListener('click', () => {
                showSection(dashboardSection);
                setActiveLink(dashboardLink);
                loadDashboardData();
            });
            
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch products: ' + error.message, 'danger');
    }
}

// Functions - User Management
async function fetchUsers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        const response = await fetch(`${AUTH_API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            // Store users globally for filtering
            allUsers = result.data;
            displayUsers(allUsers);
            
            // Update dashboard stats for all users, not just admin
            const admins = result.data.filter(user => user.role === 'admin');
            const employees = result.data.filter(user => user.role === 'employee');
            
            totalAdmins.textContent = admins.length;
            totalEmployees.textContent = employees.length;
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch users: ' + error.message, 'danger');
    }
}

// Filter users based on search input
function filterUsers() {
    const searchTerm = userSearchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is empty, show all users
        displayUsers(allUsers);
        return;
    }
    
    // Filter users based on username, fullname or role
    const filteredUsers = allUsers.filter(user => {
        return (
            user.username.toLowerCase().includes(searchTerm) ||
            user.fullname.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );
    });
    
    displayUsers(filteredUsers);
}

// Function to display filtered users list directly
async function showFilteredUsersList(roleFilter) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show custom section for users
        showSection(usersSection);
        setActiveLink(dashboardLink); // Keep dashboard link active instead of users link
        
        // Set loading state
        usersSection.innerHTML = `
            <h2 class="section-title">${roleFilter === 'admin' ? 'Admin' : 'Employee'} Users</h2>
            <div class="card">
                <div class="card-body">
                    <p>Loading users...</p>
                </div>
            </div>
        `;
        
        // Fetch users
        const response = await fetch(`${AUTH_API_URL}/users`, {
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
            // Filter users by role
            const filteredUsers = result.data.filter(user => user.role === roleFilter);
            
            // Create users list HTML
            let usersHTML = `
                <h2 class="section-title">${roleFilter === 'admin' ? 'Admin' : 'Employee'} Users</h2>
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h3 class="card-title mb-0">${roleFilter === 'admin' ? 'Admin' : 'Employee'} Users (${filteredUsers.length})</h3>
                            <button id="backToDashboard" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-arrow-left"></i> Back to Dashboard
                            </button>
                        </div>
                        <div id="filteredUsersList" class="mt-3">
            `;
            
            if (filteredUsers.length === 0) {
                usersHTML += `<div class="alert alert-info">No ${roleFilter} users found.</div>`;
            } else {
                filteredUsers.forEach(user => {
                    usersHTML += `
                        <div class="card user-card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 class="user-fullname mb-1">${user.fullname}</h5>
                                        <div class="d-flex align-items-center">
                                            <span class="user-username text-muted me-3">${user.username}</span>
                                            <span class="user-role ${user.role === 'admin' ? 'role-admin' : 'role-employee'}">${user.role}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            usersHTML += `
                        </div>
                    </div>
                </div>
            `;
            
            usersSection.innerHTML = usersHTML;
            
            // Add event listener to back button
            document.getElementById('backToDashboard').addEventListener('click', () => {
                showSection(dashboardSection);
                setActiveLink(dashboardLink);
                loadDashboardData();
            });
            
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch users: ' + error.message, 'danger');
    }
}

function displayUsers(users) {
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="alert alert-info">No users found.</div>';
        return;
    }
    
    // Get current user role
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    users.forEach(user => {
        const userCard = userTemplate.content.cloneNode(true);
        
        // Set user data
        userCard.querySelector('.user-fullname').textContent = user.fullname;
        userCard.querySelector('.user-username').textContent = user.username;
        
        const roleElement = userCard.querySelector('.user-role');
        roleElement.textContent = user.role;
        
        // Add appropriate class based on role
        if (user.role === 'admin') {
            roleElement.classList.add('role-admin');
        } else if (user.role === 'employee') {
            roleElement.classList.add('role-employee');
        } else if (user.role === 'cliente') {
            roleElement.classList.add('role-cliente');
        }
        
        // Handle user actions based on role
        const userActions = userCard.querySelector('.user-actions');
        
        if (isAdmin) {
            // Admin can edit and delete all users
            const editBtn = userCard.querySelector('.edit-user');
            editBtn.dataset.id = user.id;
            editBtn.addEventListener('click', () => loadUserForEdit(user));
            
            // Add delete button for admins
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger ms-2 delete-user';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
            deleteBtn.dataset.id = user.id;
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
            userActions.appendChild(deleteBtn);
        } else {
            // Employees can only view users, remove edit button
            const editBtn = userCard.querySelector('.edit-user');
            editBtn.remove();
            
            // Add a view-only indicator
            const viewOnlyBadge = document.createElement('span');
            viewOnlyBadge.className = 'badge bg-secondary';
            viewOnlyBadge.textContent = 'View Only';
            userActions.appendChild(viewOnlyBadge);
        }
        
        usersList.appendChild(userCard);
    });
}

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    // Add password only if provided (for updates)
    if (passwordInput.value) {
        userData.password = passwordInput.value;
    }
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
    }
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(
                `User ${userId ? 'updated' : 'created'} successfully!`, 
                'success'
            );
            resetUserForm();
            fetchUsers();
            loadDashboardData();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert(`Failed to ${userId ? 'update' : 'create'} user: ${error.message}`, 'danger');
    }
}

function loadUserForEdit(user) {
    userFormTitle.textContent = 'Edit User';
    userIdInput.value = user.id;
    usernameInput.value = user.username;
    passwordInput.value = ''; // Don't show password
    fullnameInput.value = user.fullname;
    roleInput.value = user.role;
    
    // Show password help text
    document.getElementById('passwordHelp').style.display = 'block';
    
    // Scroll to form
    userForm.scrollIntoView({ behavior: 'smooth' });
}

function resetUserForm() {
    userFormTitle.textContent = 'Add New User';
    userForm.reset();
    userIdInput.value = '';
    document.getElementById('passwordHelp').style.display = 'none';
}

// Utility Functions
function showAlert(message, type) {
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}

// Delete a user
async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${AUTH_API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to delete users', 'danger');
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('User deleted successfully!', 'success');
            fetchUsers();
            loadDashboardData();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to delete user: ' + error.message, 'danger');
    }
}