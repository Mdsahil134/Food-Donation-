pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test microservices') {
            steps {
                sh '''
                    set -e
                    for svc in auth-service donation-service notification-service tracking-service; do
                      echo "========== ${svc} =========="
                      cd "${svc}"
                      if [ -f package-lock.json ]; then
                        npm ci
                      else
                        npm install
                      fi
                      npm test
                      cd ..
                    done
                '''
            }
        }

        stage('Build backend images') {
            parallel {
                stage('auth-service') {
                    steps {
                        dir('auth-service') {
                            sh 'docker build -t foodbridge-auth-service:jenkins .'
                        }
                    }
                }
                stage('donation-service') {
                    steps {
                        dir('donation-service') {
                            sh 'docker build -t foodbridge-donation-service:jenkins .'
                        }
                    }
                }
                stage('notification-service') {
                    steps {
                        dir('notification-service') {
                            sh 'docker build -t foodbridge-notification-service:jenkins .'
                        }
                    }
                }
                stage('tracking-service') {
                    steps {
                        dir('tracking-service') {
                            sh 'docker build -t foodbridge-tracking-service:jenkins .'
                        }
                    }
                }
            }
        }

        stage('Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci && npm run build'
                }
                dir('frontend') {
                    sh 'docker build -t foodbridge-frontend:jenkins .'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'FoodBridge pipeline finished successfully.'
        }
        failure {
            echo 'FoodBridge pipeline failed — see stage logs above.'
        }
    }
}
