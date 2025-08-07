import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import io from 'socket.io-client';

// --- Helper Components & Icons ---
const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const AuthIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

// --- API Configuration ---
// IMPORTANT: Replace with your actual Render URL once deployed
const RENDER_BACKEND_URL = 'https://pricelert.onrender.com'; 

const API_URL = `${RENDER_BACKEND_URL}/api`;
const SOCKET_URL = RENDER_BACKEND_URL;

// --- Set Auth Token for Axios ---
const setAuthToken = token => {
    if (token) {
        axios.defaults.headers.common['x-auth-token'] = token;
    } else {
        delete axios.defaults.headers.common['x-auth-token'];
    }
};

const App = () => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            setAuthToken(storedToken);
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setAuthToken(null);
        setIsAuthenticated(false);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg font-semibold text-gray-500">Loading Application...</div></div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {isAuthenticated ? (
                <DashboardPage logout={logout} />
            ) : (
                <AuthPage setToken={setToken} setIsAuthenticated={setIsAuthenticated} />
            )}
        </div>
    );
};

// --- Authentication Page Component ---
const AuthPage = ({ setToken, setIsAuthenticated }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            const res = await axios.post(API_URL + endpoint, { email, password });
            const { token } = res.data;
            localStorage.setItem('token', token);
            setToken(token);
            setAuthToken(token);
            setIsAuthenticated(true);
        } catch (err) {
            setError(err.response?.data?.msg || err.response?.data?.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex justify-center"><AuthIcon /></div>
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
                    <p className="text-center text-gray-500 mb-8">{isLogin ? 'Sign in to continue' : 'Get started with your free account'}</p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105 disabled:bg-gray-400">
                            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                        </button>
                    </form>
                </div>
                <p className="text-center mt-6">
                    <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-indigo-600 hover:underline font-medium">
                        {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

// --- Dashboard Page Component ---
const DashboardPage = ({ logout }) => {
    const [monitors, setMonitors] = useState([]);
    const [url, setUrl] = useState('');
    const [email, setEmail] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchMonitors = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/monitors`);
            setMonitors(response.data);
        } catch (err) {
            console.error("Error fetching monitors:", err);
            if (err.response?.status === 401) {
                logout();
            }
            setError('Failed to fetch data.');
        }
    }, [logout]);

    useEffect(() => {
        fetchMonitors();
    }, [fetchMonitors]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const socket = io(SOCKET_URL);
        socket.on('connect', () => {
            console.log('Connected to WebSocket server!');
            socket.emit('registerUser', token);
        });
        socket.on('priceUpdate', (updatedMonitor) => {
            console.log('Received price update:', updatedMonitor);
            setMonitors(prevMonitors =>
                prevMonitors.map(m => m._id === updatedMonitor._id ? updatedMonitor : m)
            );
        });
        return () => {
            console.log('Disconnecting WebSocket.');
            socket.disconnect();
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/monitors`, { url, email, targetPrice: parseFloat(targetPrice) });
            setUrl('');
            setEmail('');
            setTargetPrice('');
            fetchMonitors();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add monitor.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/monitors/${id}`);
            fetchMonitors();
        } catch (err) {
            setError('Failed to delete monitor.');
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div className="flex items-center">
                    <ChartIcon />
                    <h1 className="text-3xl font-bold text-gray-800">Price Monitor</h1>
                </div>
                <button onClick={logout} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-all transform hover:scale-105">Logout</button>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Add New Product</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="url" className="block text-sm font-medium text-gray-600">Product URL</label>
                                <input type="url" id="url" value={url} onChange={e => setUrl(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="https://..." required />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email for Alerts</label>
                                <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="you@example.com" required />
                            </div>
                            <div>
                                <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-600">Target Price</label>
                                <input type="number" id="targetPrice" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="99.99" step="0.01" required />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 transition-all transform hover:scale-105">
                                {isLoading ? 'Adding...' : 'Add Monitor'}
                            </button>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {monitors.length > 0 ? monitors.map(monitor => (
                        <MonitorCard key={monitor._id} monitor={monitor} onDelete={handleDelete} />
                    )) : (
                        <div className="bg-white text-center p-10 rounded-xl shadow-md border border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-700">No products yet!</h3>
                            <p className="text-gray-500 mt-2">Use the form to add your first product to monitor.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- Monitor Card Component ---
const MonitorCard = ({ monitor, onDelete }) => {
    const formattedHistory = monitor.priceHistory.map(h => ({
        ...h,
        date: new Date(h.date).toLocaleDateString()
    }));

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-all hover:shadow-lg hover:border-indigo-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-indigo-700 hover:underline break-words">{monitor.url}</a>
                    <p className="text-sm text-gray-500 mt-1">Alerting: {monitor.email}</p>
                </div>
                <button onClick={() => onDelete(monitor._id)} className="ml-4 text-gray-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border-t border-b border-gray-100 py-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">Current Price</p>
                    <p className="text-2xl font-bold text-gray-800">₹{monitor.currentPrice.toLocaleString('en-IN')}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Target Price</p>
                    <p className="text-2xl font-bold text-green-600">₹{monitor.targetPrice.toLocaleString('en-IN')}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Last Checked</p>
                    <p className="text-md text-gray-600 mt-2">{new Date(monitor.lastChecked).toLocaleString()}</p>
                </div>
            </div>
            <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedHistory} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(5px)',
                                border: '1px solid #e0e0e0',
                                borderRadius: '0.5rem'
                            }}
                            formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 8 }} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
};

export default App;
