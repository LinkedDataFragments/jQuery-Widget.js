FROM node:4.4.5

# Install location
ENV dir /var/www/online-client

# Copy the client files
ADD . ${dir}

# Install the node module
RUN npm install -g http-server
RUN cd ${dir} && npm install --unsafe-perm
RUN cd ${dir} && cp settings.json /tmp && cp -r queries /tmp/queries/

# Expose the default port
EXPOSE 8080

# Run base binary
WORKDIR ${dir}
CMD cp /tmp/settings.json settings.json && rm -rf queries && cp -r /tmp/queries queries/ && npm run production && http-server build

