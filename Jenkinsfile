pipeline {
    agent any
    options {
        skipStagesAfterUnstable()
    }
    stages {
        stage('package creation') {
            steps {
                sh ''' #!/bin/bash
                echo ===> package creation on frontend server
                '''
            }
        }
        stage('Build') {
            steps {
                sh ''' #!/bin/bash
                echo ===> Build stage
                '''
            }
        }
        stage('Test') {
            steps {
                sh ''' #!/bin/bash
                echo ===> echo test case runs
                '''
            }
        }
        stage('deploy') {
            steps {
                sh ''' #!/bin/bash
                echo ===> Deploy stage complete
                '''
            }
        }
    }
}
