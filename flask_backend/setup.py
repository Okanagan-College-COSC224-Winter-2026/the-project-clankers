from setuptools import setup, find_packages
import os.path
import re

# reading package's version (same way sqlalchemy does)
#with open(
#    os.path.join(os.path.dirname(__file__), 'api', '__init__.py')
#) as v_file:
#    package_version = \
#        re.compile('.*__version__ = \'(.*?)\'', re.S)\
#        .match(v_file.read())\
#        .group(1)


dependencies = [
    'flask',
    'sqlalchemy',
    'flask-sqlalchemy',
    'marshmallow',
    'flask-marshmallow',
    'marshmallow-sqlalchemy',
    'flask-jwt-extended',
    'flask-cors',
    'python-dotenv',
]


setup(
    name='Peer-Evaluation-App-V1',
    version='1.0.0',
    author='Team 2',
    author_email='team2@example.com',
    description='Peer Evaluation App V1 backend api',
    install_requires=dependencies,
    packages=find_packages(),
)
