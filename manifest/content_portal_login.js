autoLogin();

/********************************************************************
 ** Vins Portal auto Facebook login
 */
function autoLogin() {
    var loginButton = document.getElementById('login-click');

    if (loginButton && !loginButton.getAttribute('DAF-clicked')) {
        var handler = 0,
            count = 0;

        function tryLogin() {
            var a = Array.from(document.getElementsByClassName("btn--facebook"))
                .filter(item => item.href = "https://login.pixelfederation.com/oauth/connect/facebook")[0];
            if (a || count++ >= 10) {
                clearInterval(handler);
                handler = 0;
                if (a) a.click();
            }
        }

        loginButton.setAttribute('DAF-clicked', '1');
        loginButton.click();
        handler = setInterval(tryLogin, 500);
    }
}