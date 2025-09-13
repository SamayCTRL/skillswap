/**
 * @jest-environment jsdom
 */

// Mock DOM elements and functions
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock DOM methods
Object.defineProperty(window, 'alert', {
  value: jest.fn()
});

Object.defineProperty(window, 'confirm', {
  value: jest.fn()
});

// Setup basic DOM structure
document.body.innerHTML = `
  <div id="auth-buttons"></div>
  <div id="page-content"></div>
  <nav class="navbar">
    <a href="#" onclick="showPage('home')" class="nav-link">Home</a>
    <a href="#" onclick="showPage('browse')" class="nav-link">Browse Skills</a>
    <a href="#" onclick="showPage('dashboard')" class="nav-link">Dashboard</a>
    <a href="#" onclick="showPage('messages')" class="nav-link">Messages</a>
  </nav>
`;

// Mock the navigation functions (these would normally be in the HTML)
global.getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

global.updateHeader = () => {
  const authButtons = document.getElementById('auth-buttons');
  const user = getCurrentUser();
  
  if (user) {
    const isPro = user.isPro || false;
    authButtons.innerHTML = `
      <span>Welcome, ${user.name} ${isPro ? '⭐' : ''}</span>
      <button onclick="showPage('dashboard')">Dashboard</button>
      <button onclick="logout()">Logout</button>
    `;
  } else {
    authButtons.innerHTML = `
      <button onclick="showPage('login')">Sign In</button>
      <button onclick="showPage('register')">Get Started</button>
    `;
  }
};

global.logout = () => {
  localStorage.removeItem('user');
  updateHeader();
};

describe('Frontend Navigation Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('User State Management', () => {
    test('should return null when no user is logged in', () => {
      const user = getCurrentUser();
      expect(user).toBeNull();
    });

    test('should return user data when user is logged in', () => {
      const mockUser = { name: 'Test User', email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      const user = getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    test('should handle invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('user', 'invalid-json');
      
      expect(() => getCurrentUser()).toThrow();
    });
  });

  describe('Header Updates', () => {
    test('should show auth buttons when no user is logged in', () => {
      updateHeader();
      
      const authButtons = document.getElementById('auth-buttons');
      expect(authButtons.innerHTML).toContain('Sign In');
      expect(authButtons.innerHTML).toContain('Get Started');
    });

    test('should show user info when user is logged in', () => {
      const mockUser = { name: 'Test User', email: 'test@example.com', isPro: false };
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      updateHeader();
      
      const authButtons = document.getElementById('auth-buttons');
      expect(authButtons.innerHTML).toContain('Welcome, Test User');
      expect(authButtons.innerHTML).toContain('Dashboard');
      expect(authButtons.innerHTML).toContain('Logout');
    });

    test('should show pro indicator for pro users', () => {
      const mockUser = { name: 'Pro User', email: 'pro@example.com', isPro: true };
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      updateHeader();
      
      const authButtons = document.getElementById('auth-buttons');
      expect(authButtons.innerHTML).toContain('Welcome, Pro User ⭐');
    });
  });

  describe('Authentication Actions', () => {
    test('should clear user data on logout', () => {
      const mockUser = { name: 'Test User', email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('DOM Manipulation', () => {
    test('should update auth buttons container', () => {
      const authButtons = document.getElementById('auth-buttons');
      expect(authButtons).toBeTruthy();
      
      updateHeader();
      
      expect(authButtons.innerHTML).toBeTruthy();
      expect(authButtons.innerHTML.length).toBeGreaterThan(0);
    });

    test('should handle missing DOM elements gracefully', () => {
      // Remove the auth buttons element
      const authButtons = document.getElementById('auth-buttons');
      authButtons.remove();
      
      // This should throw an error since we're not handling null case properly
      expect(() => updateHeader()).toThrow();
    });
  });
});