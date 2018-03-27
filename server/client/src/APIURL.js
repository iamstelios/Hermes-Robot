console.log(window.location.hostname);
console.log(window.location.origin);
console.log(process.env.NODE_ENV);

let apiUrl = '';
if (process.env.NODE_ENV === 'production') {
    apiUrl = window.location.origin;
}

export default apiUrl;