from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="enzian-lib",
    version="0.1.0",
    author="Gökhan",
    author_email="ghb@enzianlabs.com",
    description="Python libraries for enzian projects",
    long_description=long_description,
    long_description_content_type="text/markdown",
    python_requires=">=3.12",
    install_requires=[
        "livekit>=1.0.8,<2.0.0",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
