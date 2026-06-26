const API_URL = 'http://localhost:3000/api';
// const API_URL = '/api';


window.API = {
  get: (url) => request(url),
  post: (url, data) => request(url, 'POST', data),
  put: (url, data) => request(url, 'PUT', data),
  delete: (url) => request(url, 'DELETE')
};


async function request(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Invalid JSON response (${response.status})`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || `Request failed (${response.status})`
      );
    }

    return data;

  } catch (error) {
    console.error(error);
    throw error;
  }
}