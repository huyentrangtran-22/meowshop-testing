const { By, until } = require('selenium-webdriver');

async function login(driver, username, password) {


    // mở trang login WordPress
    await driver.get("https://meowshopp.com/login");

    // nhập username
    await driver.findElement(By.id("username-581"))
        .sendKeys(username);

    // nhập password
    await driver.findElement(By.id("user_password-581"))
        .sendKeys(password);

    // click login
    await driver.findElement(By.id("um-submit-btn")).click();

    await driver.wait(
        until.urlContains("meowshopp.com"),
        10000
    );
}

module.exports = { login };