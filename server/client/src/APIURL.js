console.log(window.location.hostname);
console.log(process.env.NODE_ENV);

let apiUrl = '';
if (process.env.NODE_ENV === 'production') {
    apiUrl = 'http://' + window.location.hostname;
}

export default apiUrl;