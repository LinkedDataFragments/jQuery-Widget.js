FROM node:6.7.0

# Install location
ENV dir /var/www/online-client

# Copy the client files
ADD . ${dir}

# Install the node module
RUN cd ${dir} && npm install --unsafe-perm
RUN cd ${dir} && cp settings.json /tmp && cp -r queries /tmp/queries/

# Expose the default port
EXPOSE 3000

# Run base binary
WORKDIR ${dir}
CMD cp /tmp/settings.json settings.json && rm -rf queries && cp -r /tmp/queries queries/ && npm start
