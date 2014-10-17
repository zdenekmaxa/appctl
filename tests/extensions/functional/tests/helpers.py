"""
Portal selenium tests helper functions.

"""

from functools import partial

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as exp_cond

from base import TestBase


def wait_for_loaded_page(url, browser, elem_class_name="widget-compass"):
    """
    Waits for a page to load URL.
    Now it seems to suffice to wait until 'widget-compass' element appears.
    Generally a tricky operation.

    """
    config = TestBase.get_config()
    browser.get(url)
    # wait for compass to appear, then start testing by taking a screenshot
    tester = partial(exp_cond.visibility_of_element_located, (By.CLASS_NAME, elem_class_name))
    msg = "Element identified by '%s' did not appear." % elem_class_name
    WebDriverWait(browser,
                  config["max_load_timeout"]).until(tester(), message=msg)
