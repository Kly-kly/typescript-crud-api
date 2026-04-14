let currentUser = null;
let requestItems = [];

window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

const STORAGE_KEY = 'ipt_demo_v1';
const routes = {
    '/': 'home-page',
    '/login': 'login-page',
    '/register': 'register-page',
    '/verify-email': 'verify-email-page',
    '/profile': 'profile-page',
    '/my-requests': 'my-requests-page',
    '/employees': 'employees-page',
    '/accounts': 'accounts-page',
    '/departments': 'departments-page'
};

const protectedRoutes = ['/profile', '/my-requests', '/employees', '/accounts', '/departments'];
const adminRoutes = ['/employees', '/accounts', '/departments'];

// =====================================================
// BACKEND HELPER FUNCTIONS
// =====================================================

function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// =====================================================
// STORAGE FUNCTIONS
// =====================================================

function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            window.db = JSON.parse(stored);
        } catch (e) {
            seedData();
        }
    } else {
        seedData();
    }
}

function seedData() {
    window.db = {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin',
                password: 'admin123',
                verified: true,
                role: 'admin'
            }
        ],
        departments: [
            { id: 1, name: 'Engineering', description: 'Engineering department' },
            { id: 2, name: 'HR', description: 'Human Resources department' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// =====================================================
// AUTH FUNCTIONS (UPDATED FOR BACKEND)
// =====================================================

function setAuthState(isAuth, user = null) {
    if (isAuth && user) {
        currentUser = user;
        let bodyClass = 'authenticated';
        
        if (user.role === 'admin') {
            bodyClass += ' is-admin';
        }
        
        document.body.className = bodyClass;
        updateUsernameDisplay(`${user.firstName} ${user.lastName}`);
        showToast(`Welcome, ${user.firstName}!`, 'success');
    } else {
        currentUser = null;
        document.body.className = 'not-authenticated';
        updateUsernameDisplay('Username');
    }
}

function updateUsernameDisplay(username) {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.textContent = username;
    }
}

async function checkAuthOnLoad() {
    const token = sessionStorage.getItem('authToken');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:3000/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const fullUser = window.db.accounts.find(acc => acc.email === data.user.username);
            if (fullUser) {
                setAuthState(true, fullUser);
            }
        } else {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// =====================================================
// REGISTER / LOGIN / LOGOUT (UPDATED FOR BACKEND)
// =====================================================

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password, role: 'user' })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Also save to local db for frontend data
            window.db.accounts.push({
                id: window.db.accounts.length + 1,
                firstName,
                lastName,
                email: email,
                password: password,
                verified: true,
                role: 'user'
            });
            saveToStorage();
            
            showSuccess('Registration successful! You can now login.');
            navigateTo('/login');
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (err) {
        showError('Network error: Cannot connect to backend');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            const user = window.db.accounts.find(a => a.email === data.user.username);
            
            if (user) {
                setAuthState(true, user);
                navigateTo('/profile');
                showSuccess('Login successful!');
            } else {
                showError('User data not found');
            }
        } else {
            showError(data.error || 'Invalid credentials');
        }
    } catch (err) {
        showError('Network error: Cannot connect to backend');
    }
}

function handleLogout(e) {
    if (e) e.preventDefault();
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    setAuthState(false);
    showSuccess('Logged out successfully');
    navigateTo('/');
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================

function showError(message) {
    showToast(message, 'danger');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showToast(message, type) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

// =====================================================
// ROUTING FUNCTIONS
// =====================================================

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    let hash = window.location.hash.slice(1) || '/';
    if (hash === '') hash = '/';
    
    hideAllPages();
    
    let pageId = routes[hash];
    
    if (!pageId) {
        showNotFoundPage();
        return;
    }
    
    const isAuthenticated = sessionStorage.getItem('authToken') !== null;
    
    if (protectedRoutes.includes(hash) && !isAuthenticated) {
        navigateTo('/login');
        return;
    }
    
    if (adminRoutes.includes(hash) && !isAdmin()) {
    showToast('Access denied: Admin only', 'danger');
    navigateTo('/');
    return;
}
    
    showPage(pageId);
    renderPageContent(hash);
}

function isAuthenticated() {
    return sessionStorage.getItem('authToken') !== null;
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

function showPage(pageId) {
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    } else {
        showNotFoundPage();
    }
}

function showNotFoundPage() {
    const notFoundPage = document.getElementById('not-found-page');
    if (notFoundPage) {
        notFoundPage.classList.add('active');
    }
}

function renderPageContent(hash) {
    switch(hash) {
        case '/verify-email':
            renderVerifyEmailPage();
            break;
        case '/profile':
            renderProfile();
            break;
        case '/accounts':
            renderAccountsList();
            break;
        case '/departments':
            renderDepartmentsList();
            break;
        case '/employees':
            renderEmployeesList();
            break;
        case '/my-requests':
            renderMyRequests();
            break;
    }
}

// =====================================================
// PAGE RENDER FUNCTIONS
// =====================================================

function renderVerifyEmailPage() {
    const email = localStorage.getItem('unverified_email');
    const emailDisplay = document.getElementById('verification-email');
    if (emailDisplay) {
        emailDisplay.textContent = email || 'No email found';
    }
}

function renderProfile() {
    if (!currentUser) return;
    
    const profilePage = document.getElementById('profile-page');
    if (!profilePage) return;
    
    profilePage.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">User Profile</h4>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-sm-4 fw-bold">Full Name:</div>
                            <div class="col-sm-8">${currentUser.firstName} ${currentUser.lastName}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4 fw-bold">Email:</div>
                            <div class="col-sm-8">${currentUser.email}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4 fw-bold">Role:</div>
                            <div class="col-sm-8">
                                <span class="badge ${currentUser.role === 'admin' ? 'bg-danger' : 'bg-info'}">
                                    ${currentUser.role.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-sm-4 fw-bold">Verified:</div>
                            <div class="col-sm-8">
                                ${currentUser.verified ? 
                                    '<span class="text-success">✅ Verified</span>' : 
                                    '<span class="text-warning">⏳ Pending</span>'
                                }
                            </div>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                            <button class="btn btn-primary" onclick="editProfile()">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderAccountsList() {
    const accountsPage = document.getElementById('accounts-page');
    if (!accountsPage) return;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Accounts Management</h2>
            <button class="btn btn-success" onclick="showAddAccountModal()">
                + Add Account
            </button>
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Verified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    window.db.accounts.forEach(account => {
        html += `
            <tr>
                <td>${account.firstName} ${account.lastName}</td>
                <td>${account.email}</td>
                <td>
                    <span class="badge ${account.role === 'admin' ? 'bg-danger' : 'bg-info'}">
                        ${account.role}
                    </span>
                </td>
                <td>${account.verified ? '✅' : '❌'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editAccount(${account.id})">Edit</button>
                    <button class="btn btn-sm btn-warning" onclick="resetPassword(${account.id})">Reset PW</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAccount(${account.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    accountsPage.innerHTML = html;
}

function showAddAccountModal() {
    const modalHtml = `
        <div class="modal fade" id="accountModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Add New Account</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="account-form">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="acc-firstname" class="form-label">First Name</label>
                                    <input type="text" class="form-control" id="acc-firstname" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="acc-lastname" class="form-label">Last Name</label>
                                    <input type="text" class="form-control" id="acc-lastname" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="acc-email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="acc-email" required>
                            </div>
                            <div class="mb-3">
                                <label for="acc-password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="acc-password" minlength="6" required>
                            </div>
                            <div class="mb-3">
                                <label for="acc-role" class="form-label">Role</label>
                                <select class="form-control" id="acc-role">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="acc-verified">
                                <label class="form-check-label" for="acc-verified">Verified</label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveNewAccount()">Save Account</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('accountModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('accountModal'));
    modal.show();
}

function saveNewAccount() {
    const firstName = document.getElementById('acc-firstname').value;
    const lastName = document.getElementById('acc-lastname').value;
    const email = document.getElementById('acc-email').value;
    const password = document.getElementById('acc-password').value;
    const role = document.getElementById('acc-role').value;
    const verified = document.getElementById('acc-verified').checked;
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    const existingUser = window.db.accounts.find(acc => acc.email === email);
    if (existingUser) {
        showError('Email already exists');
        return;
    }
    
    const newAccount = {
        id: window.db.accounts.length + 1,
        firstName,
        lastName,
        email,
        password,
        verified,
        role
    };
    
    window.db.accounts.push(newAccount);
    saveToStorage();
    
    bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
    
    showSuccess('Account created successfully!');
    renderAccountsList();
}

function editAccount(id) {
    const account = window.db.accounts.find(acc => acc.id === id);
    if (!account) return;
    
    alert(`Edit account: ${account.firstName} ${account.lastName}\nEdit feature coming soon!`);
}

function resetPassword(id) {
    const account = window.db.accounts.find(acc => acc.id === id);
    if (!account) return;
    
    const newPassword = prompt(`Enter new password for ${account.email} (min 6 characters):`);
    
    if (newPassword) {
        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }
        
        account.password = newPassword;
        saveToStorage();
        showSuccess(`Password reset for ${account.email}`);
    }
}

function deleteAccount(id) {
    const account = window.db.accounts.find(acc => acc.id === id);
    if (!account) return;
    
    if (currentUser && currentUser.id === id) {
        showError('You cannot delete your own account!');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${account.firstName} ${account.lastName}?`)) {
        window.db.accounts = window.db.accounts.filter(acc => acc.id !== id);
        saveToStorage();
        showSuccess('Account deleted successfully!');
        renderAccountsList();
    }
}

function renderDepartmentsList() {
    const departmentsPage = document.getElementById('departments-page');
    if (!departmentsPage) return;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Departments Management</h2>
            <button class="btn btn-success" onclick="showAddDepartmentModal()">
                + Add Department
            </button>
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    window.db.departments.forEach(dept => {
        html += `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-sm btn-primary" onclick="editDepartment(${dept.id})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    departmentsPage.innerHTML = html;
}

function showAddDepartmentModal() {
    const modalHtml = `
        <div class="modal fade" id="departmentModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Add New Department</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="department-form">
                            <div class="mb-3">
                                <label for="dept-name" class="form-label">Department Name</label>
                                <input type="text" class="form-control" id="dept-name" required>
                            </div>
                            <div class="mb-3">
                                <label for="dept-description" class="form-label">Description</label>
                                <textarea class="form-control" id="dept-description" rows="3" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="saveNewDepartment()">Save Department</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('departmentModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('departmentModal'));
    modal.show();
}

function saveNewDepartment() {
    const name = document.getElementById('dept-name').value;
    const description = document.getElementById('dept-description').value;
    
    if (!name || !description) {
        showError('All fields are required');
        return;
    }
    
    const newDepartment = {
        id: window.db.departments.length + 1,
        name,
        description
    };
    
    window.db.departments.push(newDepartment);
    saveToStorage();
    
    bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
    
    showSuccess('Department added successfully!');
    renderDepartmentsList();
}

function editDepartment(id) {
    const department = window.db.departments.find(dept => dept.id === id);
    if (!department) return;
    
    const newName = prompt('Enter new department name:', department.name);
    if (newName && newName.trim()) {
        const newDescription = prompt('Enter new description:', department.description);
        if (newDescription && newDescription.trim()) {
            department.name = newName.trim();
            department.description = newDescription.trim();
            saveToStorage();
            showSuccess('Department updated successfully!');
            renderDepartmentsList();
        }
    }
}

function deleteDepartment(id) {
    const department = window.db.departments.find(dept => dept.id === id);
    if (!department) return;
    
    if (confirm(`Are you sure you want to delete ${department.name} department?`)) {
        window.db.departments = window.db.departments.filter(dept => dept.id !== id);
        saveToStorage();
        showSuccess('Department deleted successfully!');
        renderDepartmentsList();
    }
}

function renderEmployeesList() {
    const employeesPage = document.getElementById('employees-page');
    if (!employeesPage) return;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Employees Management</h2>
            <button class="btn btn-success" onclick="showAddEmployeeModal()">
                + Add Employee
            </button>
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Employee ID</th>
                        <th>User</th>
                        <th>Position</th>
                        <th>Department</th>
                        <th>Hire Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    window.db.employees.forEach(emp => {
        const user = window.db.accounts.find(acc => acc.id === emp.userId);
        const dept = window.db.departments.find(d => d.id === emp.deptId);
        
        html += `
            <tr>
                <td>${emp.employeeId}</td>
                <td>${user ? user.email : 'Unknown'}</td>
                <td>${emp.position}</td>
                <td>${dept ? dept.name : 'Unknown'}</td>
                <td>${emp.hireDate}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="alert('Edit employee coming soon!')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    if (window.db.employees.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="text-center text-muted">No employees found</td>
            </tr>
        `;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    employeesPage.innerHTML = html;
}

function showAddEmployeeModal() {
    const deptOptions = window.db.departments.map(d => 
        `<option value="${d.id}">${d.name}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal fade" id="employeeModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Add New Employee</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="employee-form">
                            <div class="mb-3">
                                <label for="emp-id" class="form-label">Employee ID</label>
                                <input type="text" class="form-control" id="emp-id" required>
                            </div>
                            <div class="mb-3">
                                <label for="emp-email" class="form-label">User Email</label>
                                <select class="form-control" id="emp-email" required>
                                    <option value="">Select User</option>
                                    ${window.db.accounts.map(acc => 
                                        `<option value="${acc.id}">${acc.email}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="emp-position" class="form-label">Position</label>
                                <input type="text" class="form-control" id="emp-position" required>
                            </div>
                            <div class="mb-3">
                                <label for="emp-dept" class="form-label">Department</label>
                                <select class="form-control" id="emp-dept" required>
                                    <option value="">Select Department</option>
                                    ${deptOptions}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="emp-hire-date" class="form-label">Hire Date</label>
                                <input type="date" class="form-control" id="emp-hire-date" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="saveNewEmployee()">Save Employee</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('employeeModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
}

function saveNewEmployee() {
    const employeeId = document.getElementById('emp-id').value;
    const userId = parseInt(document.getElementById('emp-email').value);
    const position = document.getElementById('emp-position').value;
    const deptId = parseInt(document.getElementById('emp-dept').value);
    const hireDate = document.getElementById('emp-hire-date').value;
    
    if (!employeeId || !userId || !position || !deptId || !hireDate) {
        showError('All fields are required');
        return;
    }
    
    const existingEmp = window.db.employees.find(emp => emp.employeeId === employeeId);
    if (existingEmp) {
        showError('Employee ID already exists');
        return;
    }
    
    const newEmployee = {
        id: window.db.employees.length + 1,
        employeeId,
        userId,
        deptId,
        position,
        hireDate
    };
    
    window.db.employees.push(newEmployee);
    saveToStorage();
    
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
    
    showSuccess('Employee added successfully!');
    renderEmployeesList();
}

function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        window.db.employees = window.db.employees.filter(emp => emp.id !== id);
        saveToStorage();
        showSuccess('Employee deleted successfully!');
        renderEmployeesList();
    }
}

function renderMyRequests() {
    const requestsPage = document.getElementById('my-requests-page');
    if (!requestsPage || !currentUser) return;
    
    const userRequests = window.db.requests.filter(req => req.employeeEmail === currentUser.email);
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>My Requests</h2>
            <button class="btn btn-success" onclick="showNewRequestModal()">
                + New Request
            </button>
        </div>
    `;
    
    if (userRequests.length === 0) {
        html += `
            <div class="alert alert-info text-center">
                <p class="mb-0">You haven't made any requests yet.</p>
                <button class="btn btn-primary mt-3" onclick="showNewRequestModal()">
                    Create Your First Request
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Items</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        userRequests.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(request => {
            const statusClass = {
                'Pending': 'warning',
                'Approved': 'success',
                'Rejected': 'danger'
            }[request.status] || 'secondary';
            
            const itemsList = request.items.map(item => 
                `<li class="list-unstyled">${item.name} (x${item.qty})</li>`
            ).join('');
            
            html += `
                <tr>
                    <td>${formatDate(request.date)}</td>
                    <td><span class="badge bg-info">${request.type}</span></td>
                    <td>
                        <ul class="mb-0">
                            ${itemsList}
                        </ul>
                    </td>
                    <td>
                        <span class="badge bg-${statusClass}">${request.status}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewRequest(${request.id})">View</button>
                        ${request.status === 'Pending' ? 
                            `<button class="btn btn-sm btn-danger" onclick="cancelRequest(${request.id})">Cancel</button>` : 
                            ''}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    requestsPage.innerHTML = html;
}

function showNewRequestModal() {
    requestItems = [{ name: '', qty: 1 }];
    
    const modalHtml = `
        <div class="modal fade" id="requestModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Create New Request</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="request-form">
                            <div class="mb-3">
                                <label for="request-type" class="form-label">Request Type</label>
                                <select class="form-control" id="request-type" required>
                                    <option value="">Select Type</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Leave">Leave</option>
                                    <option value="Resources">Resources</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Items</label>
                                <div id="items-container"></div>
                                <button type="button" class="btn btn-sm btn-primary mt-2" onclick="addRequestItem()">
                                    Add Item
                                </button>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="submitNewRequest()">Submit Request</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('requestModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('requestModal'));
    modal.show();
    
    renderRequestItems();
}

function renderRequestItems() {
    const container = document.getElementById('items-container');
    if (!container) return;
    
    let html = '';
    
    requestItems.forEach((item, index) => {
        html += `
            <div class="row mb-2" id="item-row-${index}">
                <div class="col-md-5">
                    <input type="text" class="form-control" id="item-name-${index}" 
                           placeholder="Item name" value="${item.name}" required>
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control" id="item-qty-${index}" 
                           placeholder="Quantity" min="1" value="${item.qty}" required>
                </div>
                <div class="col-md-2">
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeRequestItem(${index})" 
                            ${requestItems.length === 1 ? 'disabled' : ''}>
                        ×
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function addRequestItem() {
    requestItems.push({ name: '', qty: 1 });
    renderRequestItems();
}

function removeRequestItem(index) {
    if (requestItems.length > 1) {
        requestItems.splice(index, 1);
        renderRequestItems();
    }
}

function submitNewRequest() {
    const type = document.getElementById('request-type').value;
    
    if (!type) {
        showError('Please select a request type');
        return;
    }
    
    const items = [];
    let hasValidItems = false;
    
    for (let i = 0; i < requestItems.length; i++) {
        const nameInput = document.getElementById(`item-name-${i}`);
        const qtyInput = document.getElementById(`item-qty-${i}`);
        
        if (nameInput && qtyInput) {
            const name = nameInput.value.trim();
            const qty = parseInt(qtyInput.value);
            
            if (name && qty > 0) {
                items.push({ name, qty });
                hasValidItems = true;
            }
        }
    }
    
    if (!hasValidItems) {
        showError('Please add at least one valid item');
        return;
    }
    
    const newRequest = {
        id: window.db.requests.length + 1,
        type,
        items,
        status: 'Pending',
        date: new Date().toISOString(),
        employeeEmail: currentUser.email
    };
    
    window.db.requests.push(newRequest);
    saveToStorage();
    
    bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
    
    showSuccess('Request submitted successfully!');
    renderMyRequests();
}

function viewRequest(id) {
    const request = window.db.requests.find(req => req.id === id);
    if (!request) return;
    
    const itemsList = request.items.map(item => 
        `• ${item.name} (Quantity: ${item.qty})`
    ).join('\n');
    
    alert(`
Request Details:
----------------
Type: ${request.type}
Date: ${formatDate(request.date)}
Status: ${request.status}
Items:
${itemsList}
    `);
}

function cancelRequest(id) {
    if (confirm('Are you sure you want to cancel this request?')) {
        const request = window.db.requests.find(req => req.id === id);
        if (request && request.status === 'Pending') {
            request.status = 'Cancelled';
            saveToStorage();
            showSuccess('Request cancelled');
            renderMyRequests();
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function editProfile() {
    alert('Edit Profile feature coming soon!');
}

function handleVerification() {
    const email = localStorage.getItem('unverified_email');
    
    if (!email) {
        showError('No unverified email found');
        navigateTo('/register');
        return;
    }
    
    const account = window.db.accounts.find(acc => acc.email === email);
    
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        showSuccess('Email verified successfully! You can now login.');
        navigateTo('/login');
    } else {
        showError('Account not found');
    }
}

// =====================================================
// EVENT LISTENERS AND INIT
// =====================================================

function setupForms() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.removeEventListener('submit', handleRegister);
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLogin);
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const verifyBtn = document.getElementById('verify-email-btn');
    if (verifyBtn) {
        verifyBtn.removeEventListener('click', handleVerification);
        verifyBtn.addEventListener('click', handleVerification);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    
    if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = '#/';
    }
    
    checkAuthOnLoad();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    setupForms();
});

// Test functions for debugging
window.testAdmin = function() {
    const admin = window.db.accounts.find(acc => acc.role === 'admin');
    if (admin) {
        setAuthState(true, admin);
        handleRouting();
    }
};

window.testUser = function() {
    let user = window.db.accounts.find(acc => acc.role === 'user' && acc.verified);
    if (!user) {
        user = {
            id: 999,
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'password',
            verified: true,
            role: 'user'
        };
        window.db.accounts.push(user);
        saveToStorage();
    }
    setAuthState(true, user);
    handleRouting();
};

window.testLogout = function() {
    setAuthState(false);
    navigateTo('/');
};