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
    packages=find_packages(exclude=["tests"]),
    install_requires=[
        "livekit>=1.0.8,<2.0.0",
        "pytest>=7.4.4",
    ],
    extras_require={
        "test": [
            "pytest>=7.0.0,<8.0.0",
            "pytest-asyncio>=0.21.0,<0.22.0",
            "pytest-cov>=4.1.0,<5.0.0",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)