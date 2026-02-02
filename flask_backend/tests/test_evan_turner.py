import os

CURRENT_DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def test_evan_turner(test_client):
    """
    GIVEN GET /evan
    WHEN the endpoint is accessed
    THEN it should return a 200 status code and the expected information
    """

    # Make a GET request to the /practice/test endpoint
    response = test_client.get("/practice/test")

    assert response.status_code == 200

    data = response.get_json()

    # Check that data is not None
    assert data is not None

    # Check for expected keys and values in the response
    assert "course" in data
    assert data["course"] == "cosc 224"