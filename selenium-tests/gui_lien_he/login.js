require('chromedriver');
const fs = require('fs');

const { Builder, By, until } = require('selenium-webdriver');

(async function loginAndSaveCookie() {

    let driver = await new Builder().forBrowser('MicrosoftEdge').build()
    await driver.manage().window().maximize();

    try {

        // mở trang login
        await driver.get('https://meowshopp.com/login');

        // nhập tài khoản
        await driver.findElement(By.id('username-581')).sendKeys('minhanh1998');

        // nhập mật khẩu
        await driver.findElement(By.id('user_password-581')).sendKeys('MinhAnh@98');

        // click login
        await driver.findElement(By.id("um-submit-btn")).click()
        await driver.sleep(5000)

        // lấy cookies
        let cookies = await driver.manage().getCookies();

        // lưu cookies ra file
        fs.writeFileSync('cookies.json', JSON.stringify(cookies));

        console.log("Đã lưu cookies");

    } finally {
        await driver.quit();
    }

})();