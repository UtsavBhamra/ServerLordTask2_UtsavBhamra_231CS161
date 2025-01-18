<div align="center">
  <h1 align="center">Task 2</h1>
</div>

<h2 align="center">Server Lord</h2>

## Setup Guide

1) This project requires `npm`,`nodejs` and `mongodb` to be installed on your system
2) Clone the repository and install all dependencies using `npm i`
3) Start the server and task monitor using `npm run start`
4) DON'T WORRY IF YOU GET ERRORS OR FAILED PING AS OUTPUT IN THE COMMAND LINE. I need to change the code a bit as the way I had implemented it earlier was a bit different from now. For now, let us just create the tasks. IGNORE THE ERRORS and move to the next repo

## Description

(Dont worry about all this. I wrote all this in the learning phase. Just follow the above steps and move to the next repo.)

#### Choice of Database-

I have used mongoDB for this project as it's a NoSQL database. NoSQL databases are horizontally scalable and hence as the number of users increases, using mongoDB makes more sense. Also the schema is flexible. MongoDB also has really good read/write performance so its latency is lower than relational DBs like mySQL, sqlite etc

#### Framework to build the API - 

I used express as I feel it offers a more intuitive and easier way to build APIs as compared to other alternatives like Django Rest Framework(DRF). It's asynchronous and event driven. Also express APIs are very lightweight and you add only those packages which you need. 

#### Caching

I was not able to implement this due to lack of time, but we can use Redis for accessing frequently used data. It will considerably reduce latency as it stores the data in the memory. 

#### Containerization and Load Balancing

We can use nginx to load balance the API and distribute the incoming requests to multiple conatiners to improve response times. Also we can enable persistance through docker. Fault tolerance will also be high in a multi-container system. 
