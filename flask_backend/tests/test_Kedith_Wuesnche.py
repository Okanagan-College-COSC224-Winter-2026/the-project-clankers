import json
import os

CURRENT_DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def test_kedith_wuensche(test_client):
    """
    GIVEN GET /practice/test
    WHEN the endpoint is called
    THEN it should return course information
    """

    response = test_client.get("/practice/test")

    # Check HTTP status
    assert response.status_code == 200

    # Convert response to JSON
    data = response.get_json()
    
    # Ensure response is not null
    assert data is not None
    
    # Ensure course key exists and has correct value
    assert "course" in data
    assert data["course"] == "cosc 224"
