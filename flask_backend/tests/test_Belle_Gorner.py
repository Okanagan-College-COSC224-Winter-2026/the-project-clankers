import json
import os

CURRENT_DIRECTORY = os.path.dirname(os.path.abspath(__file__))


def test_Belle_Gorner(test_client):
    """
    GIVEN GET /practice/test
    WHEN the endpoint is called
    THEN it should return course information
    """

    response = test_client.get("/practice/test")

    assert response.status_code == 200
    assert response.json is not None
    assert "course" in response.json
    assert response.json["course"] == "cosc 224"


