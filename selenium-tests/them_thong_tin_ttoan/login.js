const { By, until } = require('selenium-webdriver');

/**
 * Hàm login dùng chung cho tất cả testcase
 * @param driver WebDriver instance
 */
async function login(driver) {

    const username = "minhanh1998";
    const password = "MinhAnh@98";

    await driver.get("https://meowshopp.com/login");

    await driver.findElement(By.id("username-581"))
        .sendKeys(username);

    await driver.findElement(By.id("user_password-581"))
        .sendKeys(password);

    await driver.findElement(By.id("um-submit-btn")).click();

    await driver.wait(
        until.urlContains("meowshopp.com"),
        10000
    );
}

module.exports = { login };