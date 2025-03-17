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
const totalClients = document.getElementById('totalClients');

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

// API URLs
const AUTH_API_URL = '/api/auth';
const PRODUCTS_API_URL = '/api/products';

// CSRF token storage
let csrfToken = '';

// Fetch CSRF token
async function fetchCsrfToken() {
    try {
        const response = await fetch(`${AUTH_API_URL}/csrf-token`);
        if (response.ok) {
            const data = await response.json();
            csrfToken = data.csrfToken;
            return csrfToken;
        } else {
            console.error('Failed to fetch CSRF token');
            return null;
        }
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        return null;
    }
}

// Refresh access token using refresh token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        // No refresh token available, redirect to login
        window.location.href = 'login.html';
        return null;
    }
    
    try {
        // Get CSRF token first
        await fetchCsrfToken();
        
        const response = await fetch(`${AUTH_API_URL}/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update access token in localStorage
            localStorage.setItem('token', data.token);
            return data.token;
        } else {
            // Refresh token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return null;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}

// Fetch with token refresh capability
async function fetchWithAuth(url, options = {}) {
    // Get current token
    let token = localStorage.getItem('token');
    
    // Prepare headers
    if (!options.headers) {
        options.headers = {};
    }
    
    // Add CSRF token if available
    if (csrfToken) {
        options.headers['CSRF-Token'] = csrfToken;
    }
    
    // Add authorization header if token exists
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the request
    let response = await fetch(url, options);
    
    // If token expired (401), try to refresh it
    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        
        // If token refresh successful, retry the request
        if (newToken) {
            options.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, options);
        }
    }
    
    return response;
}

// Check authentication
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch CSRF token first
    await fetchCsrfToken();
    
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
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

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
        // Fetch products count
        const productsResponse = await fetchWithAuth(PRODUCTS_API_URL);
        
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            totalProducts.textContent = productsData.data.length;
        }
        
        // Fetch users count (for admin, employees, and clients)
        const usersResponse = await fetchWithAuth(`${AUTH_API_URL}/users`);
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const admins = usersData.data.filter(user => user.role === 'admin');
            const employees = usersData.data.filter(user => user.role === 'employee');
            const clients = usersData.data.filter(user => user.role === 'client');
            
            totalAdmins.textContent = admins.length;
            totalEmployees.textContent = employees.length;
            totalClients.textContent = clients.length;
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

// Functions - User Management
async function fetchUsers() {
    try {
        const response = await fetchWithAuth(`${AUTH_API_URL}/users`);
        
        if (response.status === 401) {
            // Token is invalid or expired and refresh failed
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            displayUsers(result.data);
            // Update dashboard stats for all users
            const admins = result.data.filter(user => user.role === 'admin');
            const employees = result.data.filter(user => user.role === 'employee');
            const clients = result.data.filter(user => user.role === 'client');
            
            totalAdmins.textContent = admins.length;
            totalEmployees.textContent = employees.length;
            totalClients.textContent = clients.length;
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Failed to fetch users: ' + error.message, 'danger');
    }
}

// Pagination and Search state
let currentPage = 1;
const usersPerPage = 5;
let filteredUsers = [];

// DOM Elements - Search and Filter
const userSearch = document.getElementById('userSearch');
const userFilter = document.getElementById('userFilter');
const usersCount = document.getElementById('usersList');
const usersPagination = document.getElementById('usersPagination');
const deleteUserModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
const confirmDeleteUserBtn = document.getElementById('confirmDeleteUser');

// Event Listeners - Search and Filter
userSearch.addEventListener('input', handleUserSearch);
userFilter.addEventListener('change', handleUserSearch);

function handleUserSearch() {
    currentPage = 1;
    displayUsers(filteredUsers);
}

function displayUsers(users) {
    const searchTerm = userSearch.value.toLowerCase();
    const roleFilter = userFilter.value;

    // Filter users based on search and role
    filteredUsers = users.filter(user => {
        const matchesSearch = user.fullname.toLowerCase().includes(searchTerm) ||
                            user.username.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Update users count
    usersCount.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, filteredUsers.length)} of ${filteredUsers.length} users`;

    // Clear current list
    usersList.innerHTML = '';

    if (paginatedUsers.length === 0) {
        usersList.innerHTML = '<div class="alert alert-info">No users found.</div>';
        return;
    }

    // Get current user role
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const isAdmin = currentUser && currentUser.role === 'admin';

    // Display paginated users
    paginatedUsers.forEach(user => {
        const userCard = userTemplate.content.cloneNode(true);
        
        userCard.querySelector('.user-fullname').textContent = user.fullname;
        userCard.querySelector('.user-username').textContent = user.username;
        
        const roleElement = userCard.querySelector('.user-role');
        roleElement.textContent = user.role;
        roleElement.classList.add(user.role === 'admin' ? 'role-admin' : 'role-employee');
        
        const userActions = userCard.querySelector('.user-actions');
        
        if (isAdmin) {
            const editBtn = userCard.querySelector('.edit-user');
            editBtn.dataset.id = user.id;
            editBtn.addEventListener('click', () => loadUserForEdit(user));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger ms-2 delete-user';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
            deleteBtn.addEventListener('click', () => showDeleteModal(user));
            userActions.appendChild(deleteBtn);
        } else {
            const editBtn = userCard.querySelector('.edit-user');
            editBtn.remove();
            
            const viewOnlyBadge = document.createElement('span');
            viewOnlyBadge.className = 'badge bg-secondary';
            viewOnlyBadge.textContent = 'View Only';
            userActions.appendChild(viewOnlyBadge);
        }
        
        usersList.appendChild(userCard);
    });

    // Update pagination controls
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    usersPagination.innerHTML = '';
    
    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
    prevLi.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayUsers(filteredUsers);
        }
    });
    usersPagination.appendChild(prevLi);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link">${i}</button>`;
        li.addEventListener('click', () => {
            currentPage = i;
            displayUsers(filteredUsers);
        });
        usersPagination.appendChild(li);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    nextLi.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayUsers(filteredUsers);
        }
    });
    usersPagination.appendChild(nextLi);
}

// Delete user modal handling
let userToDelete = null;

function showDeleteModal(user) {
    userToDelete = user;
    deleteUserModal.show();
}

confirmDeleteUserBtn.addEventListener('click', async () => {
    if (userToDelete) {
        await deleteUser(userToDelete.id);
        deleteUserModal.hide();
        userToDelete = null;
    }
});

// Update delete user function
async function deleteUser(id) {
    try {
        const response = await fetchWithAuth(`${AUTH_API_URL}/users/${id}`, {
            method: 'DELETE'
        });
        
        if (response.status === 401 || response.status === 403) {
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    
    const userData = {
        username: usernameInput.value.trim(),
        fullname: fullnameInput.value.trim(),
        role: roleInput.value
    };
    
    const userId = userIdInput.value;
    let url = `${AUTH_API_URL}/register`;
    let method = 'POST';
    
    // If we have a user ID, we're updating
    if (userId) {
        url = `${AUTH_API_URL}/users/${userId}`;
        method = 'PUT';
        // Add password only if provided (for updates)
        if (passwordInput.value) {
            userData.password = passwordInput.value;
        }
    } else {
        // For new users, password is required
        userData.password = passwordInput.value;
        
        // Validate that password is not empty for new users
        if (!userData.password) {
            showAlert('Password is required for new users', 'danger');
            return;
        }
    }
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(userData)
        };
        
        const response = await fetchWithAuth(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired or not admin
            showAlert('You do not have permission to perform this action', 'danger');
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

async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    // Ensure we have a CSRF token
    if (!csrfToken) {
        await fetchCsrfToken();
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
}